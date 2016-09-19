'use strict';

/*jshint -W030 */

var expect = require('chai').expect;
var _ = require('underscore');
var MultiStorageLocal = require('../');
var URL = require('url');
var fs = require('fs');
var tmp = require('tmp');
tmp.setGracefulCleanup();
var pathLib = require('path');

describe('multi-storage-local', () => {

	it('uses default settings', () => {
		// given
		let options = {};

		// when
		let instance = new MultiStorageLocal(options);

		// then
		expect(instance.options.createDirectories).to.be.true;
		expect(instance.options.flattenDirectories).to.be.false;
		expect(instance.options.baseDirectory).not.to.be.empty;
	});
	describe('paths calulations', () => {

		describe('flattening', () => {

			it('flattens a relative path correctly', () => {

				// given
				let options = {flattenDirectories: true};
				let instance = new MultiStorageLocal(options);
				let path = 'a/b/c/d';

				// when
				let flattenedPath = instance.flattenedPathForPath(path);

				// then
				expect(flattenedPath).to.equal('a-b-c-d');
			});

			it('flattens an absolute path correctly', () => {

				// given
				let options = {flattenDirectories: true};
				let instance = new MultiStorageLocal(options);
				let path = '/a/b/c/d';

				// when
				let flattenedPath = instance.flattenedPathForPath(path);

				// then
				expect(flattenedPath).to.equal('/a-b-c-d');
			});

			it('uses the provided separator', () => {

				// given
				let options = {flattenDirectories: true};
				let instance = new MultiStorageLocal(options);
				let path = '/a/b/c/d';

				// when
				let flattenedPath = instance.flattenedPathForPath(path, '###');

				// then
				expect(flattenedPath).to.equal('/a###b###c###d');
			});
		});

		describe('fileUrl => path conversion', () => {

			it('returns null if url is invalid', () => {
				// given
				let options = {};
				let instance = new MultiStorageLocal(options);
				let url1 = 'file://';
				let url2 = null;

				// when
				let path1 = instance.filePathForUrl(url1);
				let path2 = instance.filePathForUrl(url2);

				// then
				expect(path1).to.not.be.ok;
				expect(path2).to.not.be.ok;
			});

			describe('not flattened', () => {

				it('converts an URL to a path with an absolute path', () => {
					// given
					let options = {
						baseDirectory: '/baseDirectory',
						flattenDirectories: false
					};
					let instance = new MultiStorageLocal(options);
					let url = URL.parse('file:///dir1/dir2/file.ext');

					// when
					let path = instance.filePathForUrl(url);

					// then
					expect(path).to.equal('/dir1/dir2/file.ext');
				});

				it('converts an URL to a path with a relative path', () => {
					// given
					let options = {
						baseDirectory: '/baseDirectory',
						flattenDirectories: false
					};
					let instance = new MultiStorageLocal(options);
					let url = URL.parse('file://dir1/dir2/file.ext');

					// when
					let path = instance.filePathForUrl(url);

					// then
					expect(path).to.equal('/baseDirectory/dir1/dir2/file.ext');
				});
			});

			describe('flattened', () => {

				it('converts an URL to a path with an absolute path', () => {
					// given
					let options = {
						baseDirectory: '/baseDirectory',
						flattenDirectories: true
					};
					let instance = new MultiStorageLocal(options);
					let url = URL.parse('file:///dir1/dir2/file.ext');

					// when
					let path = instance.filePathForUrl(url);

					// then
					expect(path).to.equal('/dir1-dir2-file.ext');
				});

				it('converts an URL to a path with a relative path', () => {
					// given
					let options = {
						baseDirectory: '/baseDirectory',
						flattenDirectories: true
					};
					let instance = new MultiStorageLocal(options);
					let url = URL.parse('file://dir1/dir2/file.ext');

					// when
					let path = instance.filePathForUrl(url);

					// then
					expect(path).to.equal('/baseDirectory/dir1-dir2-file.ext');
				});
			});

		});

		describe('pathForOptions', () => {

			it('returns the path for options without flattening in provider', () => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp'});
				let options1 = {name: 'name.txt'};
				let options2 = {name: 'name.txt', path: 'dir1'};
				let options3 = {name: 'name.txt', path: '/dir2'};
				let options4 = {name: 'name.txt', path: '/dir3/'};

				// when
				let path1 = instance.pathForOptions(options1);
				let path2 = instance.pathForOptions(options2);
				let path3 = instance.pathForOptions(options3);
				let path4 = instance.pathForOptions(options4);

				// then
				expect(path1).to.equal('/tmp/name.txt');
				expect(path2).to.equal('/tmp/dir1/name.txt');
				expect(path3).to.equal('/tmp/dir2/name.txt');
				expect(path4).to.equal('/tmp/dir3/name.txt');
			});

			it('returns the path for options with flattening in provider', () => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp', flattenDirectories: true});
				let options1 = {name: 'name.txt'};
				let options2 = {name: 'name.txt', path: 'dir1'};
				let options3 = {name: 'name.txt', path: '/dir2'};
				let options4 = {name: 'name.txt', path: '/dir3'};

				// when
				let path1 = instance.pathForOptions(options1);
				let path2 = instance.pathForOptions(options2);
				let path3 = instance.pathForOptions(options3);
				let path4 = instance.pathForOptions(options4);

				// then
				expect(path1).to.equal('/tmp/name.txt');
				expect(path2).to.equal('/tmp/dir1-name.txt');
				expect(path3).to.equal('/tmp/dir2-name.txt');
				expect(path4).to.equal('/tmp/dir3-name.txt');
			});

			it('returns the path for options without flattening in provider but in options', () => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp'});
				let options1 = {name: 'name.txt', flatten: true};
				let options2 = {name: 'name.txt', flatten: true, path: 'dir1'};
				let options3 = {name: 'name.txt', flatten: true, path: '/dir2'};
				let options4 = {name: 'name.txt', flatten: true, path: '/dir3/'};

				// when
				let path1 = instance.pathForOptions(options1);
				let path2 = instance.pathForOptions(options2);
				let path3 = instance.pathForOptions(options3);
				let path4 = instance.pathForOptions(options4);

				// then
				expect(path1).to.equal('/tmp/name.txt');
				expect(path2).to.equal('/tmp/dir1-name.txt');
				expect(path3).to.equal('/tmp/dir2-name.txt');
				expect(path4).to.equal('/tmp/dir3-name.txt');
			});

			it('returns the path for options with flattening in provider but not in options', () => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp', flattenDirectories: true});
				let options1 = {name: 'name.txt', flatten: false};
				let options2 = {name: 'name.txt', flatten: false, path: 'dir1'};
				let options3 = {name: 'name.txt', flatten: false, path: '/dir2'};
				let options4 = {name: 'name.txt', flatten: false, path: '/dir3/'};

				// when
				let path1 = instance.pathForOptions(options1);
				let path2 = instance.pathForOptions(options2);
				let path3 = instance.pathForOptions(options3);
				let path4 = instance.pathForOptions(options4);

				// then
				expect(path1).to.equal('/tmp/name.txt');
				expect(path2).to.equal('/tmp/dir1/name.txt');
				expect(path3).to.equal('/tmp/dir2/name.txt');
				expect(path4).to.equal('/tmp/dir3/name.txt');
			});


		});

	});

	describe('Operations', () => {

		describe('get', () => {

			it('reads the file from the filesystem', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename);
				let testUrl = 'file://' + testFilePath;

				// when
				instance.get(testUrl, 'utf-8', (err, data) => {
					// then
					if (err) {
						return done(err);
					}
					if (!data || data.length === 0) {
						return done(new Error('Expected file to be read but did receive empty data'));
					}
					done();
				});
			});

			it('creates an error for an invalid url scheme', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename);
				let testUrl = 'flupp://' + testFilePath;

				// when
				instance.get(testUrl, 'utf-8', (err, data) => {
					// then
					if (!err) {
						return done(new Error('Expected to receive an error'));
					}
					done();
				});
			});

			it('creates an error for a non-existing file', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename + 'something');
				let testUrl = 'file://' + testFilePath;

				// when
				instance.get(testUrl, 'utf-8', (err, data) => {
					// then
					if (!err) {
						return done(new Error('Expected to receive an error'));
					}
					done();
				});
			});

		});

		describe('getStream', () => {

			it('returns the stream from the filesystem', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename);
				let testUrl = 'file://' + testFilePath;

				// when
				let stream = instance.getStream(testUrl, (err) => {
					// then
					if (err) {
						return done(err);
					}
				});

				expect(stream).to.be.ok;

				// see, what's in the stream by reading it
				let dataInStream = '';
				stream.on('data', (data) => { dataInStream += data });
				stream.on('end', () => {
					let err = null;
					if (dataInStream.length === 0) {
						err = new Error('Expected the stream to contain data');
					}
					done(err);
				});
			});

			it('creates an error for an invalid url scheme', () => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename);
				let testUrl = 'flupp://' + testFilePath;

				// when
				let stream = instance.getStream(testUrl);
				expect(Error.prototype.isPrototypeOf(stream)).be.true;
			});

			it('creates an error for a non-existing file', () => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename + 'something');
				let testUrl = 'file://' + testFilePath;

				// when
				let stream = instance.getStream(testUrl);
				expect(Error.prototype.isPrototypeOf(stream)).be.true;
			});

		});

		describe('post', () => {

			let tmpDir = null;
			before(function() {
				tmpDir = tmp.dirSync({unsafeCleanup: true});
			});

			after(function() {
				tmpDir.removeCallback();
			});

			it('writes the file to the filesystem', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: tmpDir.name});
				let options = {name: 'testfile-put.txt'};

				// when
				instance.post('Test Data', options, (err, url) => {
					// then
					if (err) {
						// remove the file if something went wrong
						return done(err);
					}

					// we expect the url to be relative to the base directory
					expect(url).to.equal('file://testfile-put.txt');

					let path = instance.filePathForUrl(url);
					let fileContent = fs.readFileSync(path, {encoding: 'utf-8'});
					expect(fileContent).to.equal('Test Data');
					done();
				});
			});

			it('creates an error for a non-writeable target', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/'});
				let options = {name: 'testfile-put.txt'};

				// when
				instance.post('Test Data', options, (err, url) => {
					// then
					if (!err) {
						return done(new Error('Expected put to return an error'));
					}
					expect(url).not.to.be.ok;
					done();
				});
			});

		});

		describe('postStream', () => {

			let tmpDir = null;
			before(function() {
				tmpDir = tmp.dirSync({unsafeCleanup: true});
			});

			after(function() {
				tmpDir.removeCallback();
			});

			it('writes the stream to the filesystem', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp'});
				let options = {name: 'testfile-put.txt'};

				// / when
				let stream = instance.postStream(options, (err, url) => {
					if (err) {
						return done(err);
					}

					// we expect the url to be relative to the base directory
					expect(url).to.equal('file://testfile-put.txt');

					let path = instance.filePathForUrl(url);
					let fileContent = fs.readFileSync(path, {encoding: 'utf-8'});
					expect(fileContent).to.equal('Some Data');
					done();
				});

				stream.write('Some Data');
				stream.end();
			});

			it('creates an error for a non-writeable target', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/'});
				let options = {name: 'testfile-put.txt'};

				// when
				instance.postStream(options, (err, url) => {
					// then
					if (!err) {
						return done(new Error('Expected putStream to return an error'));
					}

					expect(url).not.to.be.ok;
					done();
				});
			});

		});

		describe('delete', () => {

			it('deletes the file', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp'});
				let options = {name: 'testfile-put.txt'};
				instance.post('some data', options, (postErr, url) => {
					expect(postErr).not.to.be.ok;
					expect(url).to.be.ok;

					let path = instance.filePathForUrl(url);
					expect(fs.existsSync(path)).to.be.true;

					// when
					instance.delete(url, (deleteErr) => {
						expect(fs.existsSync(path)).to.be.false;
						done(deleteErr);
					});

				});

			});

		});

	});

});