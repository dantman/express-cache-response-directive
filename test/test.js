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

	describe('when passed private: true', function() {
		requestShouldHaveCacheControl('/private-obj', "private");
	});

	describe('when passed private: true, max-age: 300', function() {
		requestShouldHaveCacheControl('/max-age', "private, max-age=300");
	});

	describe('when passed private: true, maxAge: 300', function() {
		requestShouldHaveCacheControl('/max-age-alt', "private, max-age=300");
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
});
