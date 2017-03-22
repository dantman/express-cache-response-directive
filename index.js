"use strict";
var debug = require('debug')('express-cache-response-directive'),
	util = require('util'),
	Qty = require('js-quantities'),
	// Cache-Control header name
	cacheControlHeader = 'Cache-Control',
	// Regexp matching HTTP/1.1 tokens
	tokenRegexp = /^[^\x00-\x1F\x7F()<>@,;:\\"\/\[\]?={} ]+$/,
	// Directives defined by HTTP/1.1
	validDirectives = [
		'public',
		'private',
		'no-cache',
		'no-store',
		'max-age',
		's-maxage',
		'must-revalidate',
		'proxy-revalidate',
		'no-transform',
		'stale-while-revalidate',
		'stale-if-error'
	],
	// Directives with an optional field-name value
	optionalFieldDirectives = [
		'private',
		'no-cache'
	],
	// Directives that use a number of seconds as a value
	deltaDirectives = [
		'max-age',
		's-maxage',
		'stale-while-revalidate',
		'stale-if-error'
	],
	// Map of camel-cased option keys to the corresponding Cache-Control directives
	keyMap = {
		noCache: 'no-cache',
		noStore: 'no-store',
		noTransform: 'no-transform',
		mustRevalidate: 'must-revalidate',
		proxyRevalidate: 'proxy-revalidate',
		maxAge: 'max-age',
		sMaxage: 's-maxage',
		sMaxAge: 's-maxage',
		staleWhileRevalidate: 'stale-while-revalidate',
		staleIfError: 'stale-if-error'
	},
	// Default values for string patterns
	patternDefaults = {
		'public': {
			'public': true
		},
		'private': {
			'private': true,
		},
		'no-cache': {
			'no-cache' : true
		},
		'no-store': {
			'no-store' : true
		}
	};

function normalizeOpts(pattern, opts) {
	var normOpts = {},
		opt,
		normOpt;

	if ( typeof pattern === 'string' ) {
		opts = opts || {};

		if ( !patternDefaults.hasOwnProperty(pattern) ) {
			throw new Error("Cache-Control: Unknown simple directive pattern");
		}

		pattern = patternDefaults[pattern];

		for ( opt in pattern ) {
			normOpts[opt] = pattern[opt];
		}
	} else {
		opts = pattern || {};
	}

	for ( opt in opts ) {
		normOpt = keyMap.hasOwnProperty(opt) ?
			keyMap[opt] :
			opt;

		if ( validDirectives.indexOf(normOpt) !== -1 ) {
			normOpts[normOpt] = opts[opt];
		} else {
			debug('non-standard opt %s: %s ignored', normOpt, opts[opt]);
			// @todo Should we warn about unknown opts or treat them as extensions?
		}
	}

	// public, private, and no-cache/no-store are exclusive they may not be defined together
	// however no-cache and no-store may be defined together
	// and private and no-cache are only exclusive while true as other non-falsy values indicate per-header behavior
	var exclusiveDirectives = 0;
	if ( normOpts['public'] ) { exclusiveDirectives++; }
	if ( normOpts['private'] === true ) { exclusiveDirectives++; }
	if ( normOpts['no-cache'] === true || normOpts['no-store'] ) { exclusiveDirectives++; }

	if ( exclusiveDirectives > 1 ) {
		throw new Error("Cache-Control: The public, private:true, and no-cache:true/no-store directives are exclusive, you cannot define more than one of them.");
	}

	// Some browsers have begun treating no-cache like they do no-store so when
	// no-store is set also define no-cache.
	if ( normOpts['no-store'] && !normOpts['no-cache'] ) {
		normOpts['no-cache'] = true;
	}

	// If max-age is defined and no private, no-cache, or no-store is defined implicitly define public.
	if ( normOpts['max-age'] && !(normOpts['public'] || normOpts['private'] === true || normOpts['no-cache'] === true || normOpts['no-store']) ) {
		normOpts['public'] = true;
	}

	// If private, no-cache, or no-store is defined s-maxage is meaningless
	if ( normOpts['private'] === true || normOpts['no-cache'] === true || normOpts['no-store'] ) {
		delete normOpts['s-maxage'];
	}

	return normOpts;
}

module.exports = function cacheResponseDirective() {
	function cacheControl(pattern, opts) {
		// jshint validthis: true
		opts = normalizeOpts(pattern, opts);

		var directives = [];

		validDirectives.forEach(function(directiveName) {
			// jshint newcap: false
			if ( !opts.hasOwnProperty(directiveName) ) {
				return;
			}

			var value = opts[directiveName],
				m,
				qty;

			if ( !value ) {
				return;
			}

			if ( deltaDirectives.indexOf(directiveName) !== -1 ) {
				if ( typeof value === 'string' ) {
					if ( m = /^(\d+)\s*(s|sec|seconds?)$/i.exec(value) ) {
						qty = Qty(parseInt(m[1], 10) + ' seconds');
					} else if ( m = /^(\d+)\s*(min|minutes?)$/i.exec(value) ) {
						qty = Qty(parseInt(m[1], 10) + ' minutes');
					} else if ( m = /^(\d+)\s*(h|hours?)$/i.exec(value) ) {
						qty = Qty(parseInt(m[1], 10) + ' hours');
					} else if ( m = /^(\d+)\s*(d|days?)$/i.exec(value) ) {
						qty = Qty(parseInt(m[1], 10) + ' days');
					} else if ( m = /^(\d+)\s*(w|wk|weeks?)$/i.exec(value) ) {
						qty = Qty(parseInt(m[1], 10) + ' weeks');
					} else if ( m = /^(\d+)\s*(months?)$/i.exec(value) ) {
						var months = parseInt(m[1], 10),
							days = months * 30;
						debug('treating %s month(s) as %s days for %s', months, days, directiveName);
						qty = Qty(days + ' days');
					} else if ( m = /^(\d+)\s*(y|years?)$/i.exec(value) ) {
						qty = Qty(parseInt(m[1], 10) + ' years');
					} else {
						throw new Error(util.format("cacheControl: Invalid time string `%s` for the %s delta directive.", value, directiveName));
					}

					value = Math.round(qty.to('seconds').scalar);
				}

				if ( typeof value === 'number' ) {
					directives.push(directiveName + '=' + value);
				} else {
					throw new Error(util.format("cacheControl: Invalid value `%s` for the %s delta directive.", value, directiveName));
				}
			} else if ( optionalFieldDirectives.indexOf(directiveName) !== -1 ) {
				if ( value === true ) {
					directives.push(directiveName);
					return;
				}

				if ( !Array.isArray(value) ) {
					value = [value];
				}

				value = value.filter(function(val) {
					return val !== false;
				});

				value.forEach(function(val) {
					if ( typeof val === 'string' ) {
						if ( tokenRegexp.test(val) ) {
							return;
						}

						throw new Error(util.format("cacheControl: Invalid token \"%s\" for the %s field directive.", val, directiveName));
					}

					throw new Error(util.format("cacheControl: Invalid value `%s` for the %s field directive.", val, directiveName));
				});

				if ( value.length ) {
					directives.push(directiveName + '="' + value.join(', ') + '"');
				}
			} else {
				// Everything else is a boolean directive with no value
				directives.push(directiveName);
			}
		});

		if ( directives.length ) {
			this.set(cacheControlHeader, directives.join(', '));
		}
	}

	return function cacheResponseDirectiveMiddleware(req, res, next) {
		res.cacheControl = cacheControl;

		next();
	};
};
