/* jshint unused: false, expr: true */
/* global describe, it */
"use strict";
var util = require('util'),
	expect = require('chai').expect,
	express = require('express'),
	request = require('supertest'),
	cacheResponseDirective = require('../'),
	app = express();

app.use(cacheResponseDirective());

function route(path, cb) {
	app.get(path, function(req, res) {
		cb.call(res);
		res.send('');
	});
}

route('/public-obj', function() {
	this.cacheControl({
		'public': true
	});
});

route('/private-obj', function() {
	this.cacheControl({
		'private': true
	});
});

route('/max-age', function() {
	this.cacheControl({
		'private': true,
		'max-age': 300
	});
});

route('/max-age-alt', function() {
	this.cacheControl({
		'private': true,
		maxAge: 300
	});
});

route('/max-age-300s', function() {
	this.cacheControl({
		maxAge: '300s'
	});
});

route('/max-age-300-s', function() {
	this.cacheControl({
		maxAge: '300 s'
	});
});

route('/max-age-300-s', function() {
	this.cacheControl({
		maxAge: '300 seconds'
	});
});

route('/max-age-5minutes', function() {
	this.cacheControl({
		maxAge: '5 minutes'
	});
});

route('/max-age-5min', function() {
	this.cacheControl({
		maxAge: '5 min'
	});
});

route('/max-age-1hour', function() {
	this.cacheControl({
		maxAge: '1 hour'
	});
});

route('/max-age-1h', function() {
	this.cacheControl({
		maxAge: '1h'
	});
});

route('/max-age-3day', function() {
	this.cacheControl({
		maxAge: '3 days'
	});
});

route('/max-age-1week', function() {
	this.cacheControl({
		maxAge: '1 week'
	});
});

route('/max-age-1month', function() {
	this.cacheControl({
		maxAge: '1 month'
	});
});

route('/max-age-1year', function() {
	this.cacheControl({
		maxAge: '1 year'
	});
});

route('/no-transform', function() {
	this.cacheControl({
		noTransform: true
	});
});

route('/s-maxage-1', function() {
	this.cacheControl({
		's-maxage': 600
	});
});

route('/s-maxage-2', function() {
	this.cacheControl({
		sMaxAge: 600
	});
});

route('/s-maxage-3', function() {
	this.cacheControl({
		sMaxage: 600
	});
});

route('/staleWhileRevalidate-1', function() {
    this.cacheControl({
        'stale-while-revalidate': 600
    });
});

route('/staleWhileRevalidate-2', function() {
    this.cacheControl({
        staleWhileRevalidate: 600
    });
});

route('/staleWhileRevalidate-1h', function() {
    this.cacheControl({
        staleWhileRevalidate: '1h'
    });
});

route('/staleIfError-1', function() {
    this.cacheControl({
        'stale-if-error': 600
    });
});

route('/staleIfError-2', function() {
    this.cacheControl({
        staleIfError: 600
    });
});

route('/staleIfError-1h', function() {
    this.cacheControl({
        staleIfError: '1h'
    });
});

route('/must-revalidate', function() {
	this.cacheControl({
		mustRevalidate: true
	});
});

route('/proxy-revalidate', function() {
	this.cacheControl({
		proxyRevalidate: true
	});
});

route('/public-pattern', function() {
	this.cacheControl('public');
});

route('/private-pattern', function() {
	this.cacheControl('private');
});

route('/no-cache-pattern', function() {
	this.cacheControl('no-cache');
});

route('/no-store-pattern', function() {
	this.cacheControl('no-store');
});

route('/unknown-pattern-error', function() {
	this.cacheControl('unknown');
});

route('/pattern-and-opts', function() {
	this.cacheControl('private', {
		mustRevalidate: true
	});
});

route('/public-with-private-header', function() {
	this.cacheControl('public', {
		'private': "X-Private"
	});
});

route('/public-with-private-headers', function() {
	this.cacheControl('public', {
		'private': ["X-Private-1", "X-Private-2"]
	});
});

route('/public-with-no-cache-header', function() {
	this.cacheControl('public', {
		noCache: "X-Uncached"
	});
});

app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.json({
		error: {
			message: err.message,
			stack: err.stack
		}
	});
});

describe('res.cacheControl', function() {
	function requestShouldHaveCacheControl(path, cacheControl) {
		it(util.format('should have a Cache-Control header matching "%s"', cacheControl), function(done) {
			request(app)
				.get(path)
				.end(function(err, res) {
					expect(err).to.not.exist;
					if ( res.status !== 200 && res.body.error ) {
						throw res.body.error;
					} else {
						expect(res).to.have.property('status')
							.that.equals(200);
					}

					expect(res.get('Cache-Control')).to.equal(cacheControl);

					done();
				});
		});
	}

	describe('when passed public: true', function() {
		requestShouldHaveCacheControl('/public-obj', "public");
	});

	describe('when passed private: true', function() {
		requestShouldHaveCacheControl('/private-obj', "private");
	});

	describe('when passed private: true, max-age: 300', function() {
		requestShouldHaveCacheControl('/max-age', "private, max-age=300");
	});

	describe('when passed private: true, maxAge: 300', function() {
		requestShouldHaveCacheControl('/max-age-alt', "private, max-age=300");
	});

	describe('when passed maxAge: "300s"', function() {
		requestShouldHaveCacheControl('/max-age-300s', 'public, max-age=300');
	});

	describe('when passed maxAge: "300 s"', function() {
		requestShouldHaveCacheControl('/max-age-300-s', 'public, max-age=300');
	});

	describe('when passed maxAge: "300 seconds"', function() {
		requestShouldHaveCacheControl('/max-age-300-s', 'public, max-age=300');
	});

	describe('when passed maxAge: "5 minutes"', function() {
		requestShouldHaveCacheControl('/max-age-5minutes', 'public, max-age=300');
	});

	describe('when passed maxAge: "5 min"', function() {
		requestShouldHaveCacheControl('/max-age-5min', 'public, max-age=300');
	});

	describe('when passed maxAge: "1 hour"', function() {
		requestShouldHaveCacheControl('/max-age-1hour', 'public, max-age=3600');
	});

	describe('when passed maxAge: "1h"', function() {
		requestShouldHaveCacheControl('/max-age-1h', 'public, max-age=3600');
	});

	describe('when passed maxAge: "3 days"', function() {
		requestShouldHaveCacheControl('/max-age-3day', 'public, max-age=259200');
	});

	describe('when passed maxAge: "1 week"', function() {
		requestShouldHaveCacheControl('/max-age-1week', 'public, max-age=604800');
	});

	describe('when passed maxAge: "1 month"', function() {
		requestShouldHaveCacheControl('/max-age-1month', 'public, max-age=2592000');
	});

	describe('when passed maxAge: "1 year"', function() {
		requestShouldHaveCacheControl('/max-age-1year', 'public, max-age=31556926');
	});

	describe('when passed noTransform: true', function() {
		requestShouldHaveCacheControl('/no-transform', "no-transform");
	});

	describe('when passed s-maxage: 600', function() {
		requestShouldHaveCacheControl('/s-maxage-1', "s-maxage=600");
	});

	describe('when passed sMaxAge: 600', function() {
		requestShouldHaveCacheControl('/s-maxage-2', "s-maxage=600");
	});

	describe('when passed sMaxage: 600', function() {
		requestShouldHaveCacheControl('/s-maxage-3', "s-maxage=600");
	});

    describe('when passed staleWhileRevalidate: 600', function() {
        requestShouldHaveCacheControl('/staleWhileRevalidate-1', "stale-while-revalidate=600");
    });

    describe('when passed stale-while-revalidate: 600', function() {
        requestShouldHaveCacheControl('/staleWhileRevalidate-2', "stale-while-revalidate=600");
    });

    describe('when passed stale-while-revalidate: 1h', function() {
        requestShouldHaveCacheControl('/staleWhileRevalidate-1h', "stale-while-revalidate=3600");
    });

    describe('when passed stale-if-error: 600', function() {
        requestShouldHaveCacheControl('/staleIfError-1', "stale-if-error=600");
    });

    describe('when passed staleIfError: 600', function() {
        requestShouldHaveCacheControl('/staleIfError-2', "stale-if-error=600");
    });

    describe('when passed staleIfError: 1h', function() {
        requestShouldHaveCacheControl('/staleIfError-1h', "stale-if-error=3600");
    });

	describe('when passed mustRevalidate: true', function() {
		requestShouldHaveCacheControl('/must-revalidate', "must-revalidate");
	});

	describe('when passed proxyRevalidate: true', function() {
		requestShouldHaveCacheControl('/proxy-revalidate', "proxy-revalidate");
	});

	describe('when passed "public"', function() {
		requestShouldHaveCacheControl('/public-pattern', "public");
	});

	describe('when passed "private"', function() {
		requestShouldHaveCacheControl('/private-pattern', "private");
	});

	describe('when passed "no-cache"', function() {
		requestShouldHaveCacheControl('/no-cache-pattern', "no-cache");
	});

	describe('when passed "no-store"', function() {
		requestShouldHaveCacheControl('/no-store-pattern', "no-cache, no-store");
	});

	describe('when passed "unknown"', function() {
		it('should throw an error', function(done) {
			request(app)
				.get('/unknown-pattern-error')
				.end(function(err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.a.property('status')
						.that.equals(500);
					expect(res).to.have.a.property('body')
						.that.has.a.property('error');

					done();
				});
		});
	});

	describe('when passed "private" and mustRevalidate: true', function() {
		requestShouldHaveCacheControl('/pattern-and-opts', "private, must-revalidate");
	});

	describe('when passed "public" and private: "X-Private"', function() {
		requestShouldHaveCacheControl('/public-with-private-header', 'public, private="X-Private"');
	});

	describe('when passed "public" and private: ["X-Private-1", "X-Private-2"]', function() {
		requestShouldHaveCacheControl('/public-with-private-headers', 'public, private="X-Private-1, X-Private-2"');
	});

	describe('when passed "public" and no-cache: "X-Uncached"', function() {
		requestShouldHaveCacheControl('/public-with-no-cache-header', 'public, no-cache="X-Uncached"');
	});

});
