'use strict';

/*jshint -W030 */

var expect = require('chai').expect;
var _ = require('underscore');
var MultiStorageLocal = require('../');
var MultiStorage = require('node-multi-storage');
var URL = require('url');
var fs = require('fs');
var tmp = require('tmp');
tmp.setGracefulCleanup();
var pathLib = require('path');

describe('multi-storage integration', () => {

	let tmpDir = null;
	before(function () {
		tmpDir = tmp.dirSync({unsafeCleanup: true});
	});

	after(function () {
		tmpDir.removeCallback();
	});
	
	describe('post', () => {

		it('posts to file', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			// when
			storage.post('some data', (err, urls) => {
				// then
				expect(urls).to.be.an.array;
				expect(urls.length).to.equal(1);

				let url = urls[0];
				let filePath = pathLib.join(baseDirectory, url.substring('file://'.length));
				let readData = fs.readFileSync(filePath, {encoding: 'utf-8'});
				expect(readData).to.equal('some data');
				done(err);
			});

		});

	});

	describe('postStream', () => {
		
		it('posts to a stream', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});
			
			// when
			let stream = storage.postStream((err, urls) => {
				// then
				expect(urls).to.be.an.array;
				expect(urls.length).to.equal(1);

				let url = urls[0];
				let filePath = pathLib.join(baseDirectory, url.substring('file://'.length));
				let readData = fs.readFileSync(filePath, {encoding: 'utf-8'});
				expect(readData).to.equal('some data');
				done(err);
			});
			
			stream.end('some data');
		});
	});

	describe('get', () => {
		it('gets a file', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			storage.post('some data', (err, urls) => {
				expect(urls).to.be.an.array;
				expect(urls.length).to.equal(1);

				// when
				let url = urls[0];
				storage.get(url, (err, data) => {
					// then
					expect(data).to.equal('some data');
					done(err);
				});
			});
		});
	});

	describe('getStream', () => {
		it('gets from a stream', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			storage.post('some data', (err, urls) => {
				expect(urls).to.be.an.array;
				expect(urls.length).to.equal(1);

				// when
				let url = urls[0];
				let receivedData = '';
				let stream = storage.getStream(url, (err) => {
					// then
					expect(receivedData).to.equal('some data');
					done(err);
				});

				stream.on('data', (chunk) => {receivedData += chunk});
			});

		});
	});

	describe('delete', () => {
		it('deletes a file', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			storage.post('some data', (err, urls) => {
				expect(urls).to.be.an.array;
				expect(urls.length).to.equal(1);

				// when
				let url = urls[0];
				let filePath = pathLib.join(baseDirectory, url.substring('file://'.length));
				expect(fs.existsSync(filePath)).to.be.true;
				storage.delete(url, (err) => {
					// then
					expect(fs.existsSync(filePath)).to.be.false;
					done(err);
				});
			});
		});
	});
});
