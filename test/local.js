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

		describe('path => fileUrl conversion', () => {

			it('returns null if path is null', () => {
				// given
				let options = {};
				let instance = new MultiStorageLocal(options);

				let path1 = '';
				let path2 = null;

				// when
				let url1 = instance.urlForFilePath(path1);
				let url2 = instance.urlForFilePath(path2);

				// then
				expect(url1).not.to.be.ok;
				expect(url2).not.to.be.ok;
			});

			it('returns the correct url for a valid path', () => {
				// given
				let options = {baseDirectory: '/tmp'};
				let instance = new MultiStorageLocal(options);

				let path1 = '/tmp/dir1/file.txt';
				let path2 = '/tmp/the dir/the file.txt';

				// when
				let url1 = instance.urlForFilePath(path1);
				let url2 = instance.urlForFilePath(path2);

				// then
				expect(url1).to.equal('file://dir1/file.txt');
				expect(url2).to.equal('file://the%20dir/the%20file.txt');
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
					let url1 = URL.parse('file:///dir1/dir2/file.ext');
					let url2 = 'file://the%20dir/the%20file.txt';

					// when
					let path1 = instance.filePathForUrl(url1);
					let path2 = instance.filePathForUrl(url2);

					// then
					expect(path1).to.equal('/baseDirectory/dir1/dir2/file.ext');
					expect(path2).to.equal('/baseDirectory/the dir/the file.txt');
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
					let url = 'file:///dir1/dir2/file.ext';

					// when
					let path = instance.filePathForUrl(url);

					// then
					expect(path).to.equal('/baseDirectory/dir1-dir2-file.ext');
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

		describe('getStream', () => {

			it('returns the stream from the filesystem', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename);
				let testUrl = 'file://' + testFilePath;

				// when
				instance.getStream(testUrl)
					.then((stream) => {
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
					})
					.catch(err => done(err));
			});

			it('creates an error for an invalid url scheme', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename);
				let testUrl = 'flupp://' + testFilePath;

				// when
				instance.getStream(testUrl)
					.then(stream => done(new Error('Expected an array')))
					.catch(err => done());
			});

			it('creates an error for a non-existing file', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: __dirname});
				let testFilePath = pathLib.basename(__filename + 'something');
				let testUrl = 'file://' + testFilePath;

				// when
				let stream = instance.getStream(testUrl)
					.then(stream => done(new Error('Expected an array')))
					.catch(err => done());
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
				instance.postStream(options)
					.then((stream) => {
						return new Promise((resolve, reject) => {
							stream.end('Some Data', (err) => {
								if (err) {
									return reject(err);
								}
								resolve(stream);
							});

						});
					})
					.then((stream) => {
						// we expect the url to be relative to the base directory
						expect(stream.url).to.equal('file://testfile-put.txt');

						let path = instance.filePathForUrl(stream.url);
						let fileContent = fs.readFileSync(path, {encoding: 'utf-8'});
						expect(fileContent).to.equal('Some Data');
						done();
					})
					.catch(err => done(err));
			});

			it('creates an error for a non-writeable target', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/'});
				let options = {name: 'testfile-put.txt'};

				// when
				instance.postStream(options)
					.then((stream) => done(new Error('Expected an error')))
					.catch(err => done());
			});

			it('creates the directories needed to post a stream', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: tmpDir.name});
				let options = {name: 'testfile-postStream.txt', path: 'dir1/dir2'};

				// when
				instance.postStream(options)
					.then((stream) => {
						return new Promise((resolve) => {
							stream.write('Some Data');
							stream.end();
							resolve(stream);
						});
					})
					.then((stream) => {
						expect(stream.url).to.equal('file://dir1/dir2/testfile-postStream.txt');
						let filePath = pathLib.join(tmpDir.name, 'dir1/dir2/testfile-postStream.txt');
						expect(fs.existsSync(filePath)).to.be.true;
						done();
					})
					.catch(err => done(err));
			});

		});

		describe('delete', () => {

			it('deletes the file', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp'});
				let options = {name: 'testfile-put.txt'};

				let pathOfFile = null;
				instance.postStream(options)
					.then((stream) => {
						return new Promise((resolve) => {
							stream.write('Some Data');
							stream.end();
							resolve(stream);
						});
					})
					.then((stream) => {
						let url = stream.url;
						// when
						pathOfFile = instance.filePathForUrl(url);
						expect(fs.existsSync(pathOfFile)).to.be.true;
						return instance.delete(url);
					})
					.then(() => {
						// then
						expect(fs.existsSync(pathOfFile)).to.be.false;
						done();
					})
					.catch(err => done(err));
			});

			it('does not return an error if file does not exist', (done) => {
				// given
				let instance = new MultiStorageLocal({baseDirectory: '/tmp'});

				// when
				instance.delete('file://tmp/123456.txt')
					.then(() => done())
					.catch(err => done(err));
			});

		});

	});

});