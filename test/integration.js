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
			storage.post('some data',{name: 'the file.txt'})
				.then((urls) => {
					expect(urls).to.be.an.array;
					expect(urls.length).to.equal(1);

					let url = urls[0];
					let filePath = provider.filePathForUrl(url);
					let readData = fs.readFileSync(filePath, {encoding: 'utf-8'});
					expect(readData).to.equal('some data');
					done();
				})
				.catch(err => done(err));
		});

	});

	describe('postStream', () => {

		it('posts to a stream', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			// when
			storage.postStream().then((stream) => {
					return new Promise((resolve, reject) => {
						stream.end('some data', err => (err) ? reject(err) : resolve(stream));
					});
				})
				.then((stream) => {
					let urls = stream.urls;
					expect(urls).to.be.an.array;
					expect(urls.length).to.equal(1);

					let url = urls[0];
					let filePath = provider.filePathForUrl(url);
					let readData = fs.readFileSync(filePath, {encoding: 'utf-8'});
					expect(readData).to.equal('some data');
					done();
				})
				.catch(err => done(err));
		});
	});

	describe('get', () => {
		it('gets a file', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			storage.post('some data')
				.then((urls) => {
					expect(urls).to.be.an.array;
					expect(urls.length).to.equal(1);
					// when
					return storage.get(urls[0]);
				})
				.then((data) => {
					// then
					expect(data).to.equal('some data');
					done();
				})
				.catch(err => done(err));
		});
	});

	describe('getStream', () => {
		it('gets from a stream', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			storage.post('some data')
				.then((urls) => {
					expect(urls).to.be.an.array;
					expect(urls.length).to.equal(1);
					// when
					return storage.getStream(urls[0]);
				})
				.then((stream) => {
					let receivedData = '';
					stream.on('data', chunk => receivedData += chunk);
					stream.on('end', () => {
						expect(receivedData).to.equal('some data');
						done();
					});
				})
				.catch(err => done(err));
		});
	});

	describe('delete', () => {
		it('deletes a file', (done) => {
			// given
			let baseDirectory = tmpDir.name;
			let provider = new MultiStorageLocal({baseDirectory: baseDirectory});
			let storage = new MultiStorage({providers: [provider]});

			let filePathToRemove = null;
			storage.post('some data')
				.then((urls) => {
					expect(urls).to.be.an.array;
					expect(urls.length).to.equal(1);

					let url = urls[0];
					let filePathToRemove = provider.filePathForUrl(url);
					expect(fs.existsSync(filePathToRemove)).to.be.true;

					// when
					return storage.delete(url);
				})
				.then(() => {
					expect(fs.existsSync(filePathToRemove)).to.be.false;
					done();
				})
				.catch(err => done(err));
		});
	});
});
