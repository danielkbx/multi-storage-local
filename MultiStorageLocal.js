'use strict';

let _ = require('underscore');
let path = require('path');
let fs = require('fs');
let URL = require('url');
let Callback = require('node-callback');
let printf = require('util').format;
var mkdirp = require('mkdirp');
var async = require('async');

class MultiStorageLocal {

	constructor(options) {
		this.options = _.extend({
			createDirectories: true,
			flattenDirectories: false,
			baseDirectory: path.join(process.cwd(), 'multi-storage-local')
		}, options);
	}

	get name() {
		return 'ms-local';
	}

	get schemes() {
		return ['file'];
	}

	_isUrlValid(url) {
		let scheme = this.schemes.find((scheme) => { return url.startsWith(scheme + '://') });
		return !!scheme;
	}

	pathForOptions(options) {

		options = _.extend({
			flatten: this.options.flattenDirectories,
			path: ''
		}, options);

		// paths are always relative
		if (options.path.startsWith('/')) {
			options.path = options.path.substr(1, options.path.length - 1);
		}
		// and they never end with a slash
		if (options.path.endsWith('/')) {
			options.path = options.path.substr(0, options.path.length - 1);
		}

		let result = options.path + '/' + options.name;

		// flatten if needed
		if (options.flatten) {
			result = this.flattenedPathForPath(result);
		}

		// create the final path
		result = path.join(this.options.baseDirectory, result);

		return result;
	}

	flattenedPathForPath(path, separator) {
		separator = separator || '-';
		let isRelative = path.startsWith('/');
		if (isRelative) {
			path = '/' + path.substr(1, path.length - 1).replace(/\//g, separator);
		} else {
			path = path.replace(/\//g, separator);
		}
		return path;
	}

	filePathForUrl(url) {
		if (!url) {
			return null;
		}

		if (_.isString(url)) {
			url = URL.parse(url);
		}

		if (!url.host && !url.path) {
			return null;
		}

		let path = url.host;
		if (url.path && url.path !== '/') {
			path += url.path;
		}

		if (this.options.flattenDirectories) {
			path = this.flattenedPathForPath(path);
		}

		let isRelative = !!url.hostname;
		if (isRelative) {
			path = this.options.baseDirectory + '/' + path;
		}

		return path;
	}

	get(url, encoding, callback) {
		let cb = new Callback(callback);
		let that = this;
		if (!that._isUrlValid(url)) {
			return cb.call(new Error(printf('Unable to handle url "%s" due to unsupported scheme', url)));
		}

		let path = this.filePathForUrl(url);

		fs.access(path, fs.R_OK, (err) => {
			if (err) {
				return cb.call(err, null);
			}

			fs.readFile(path, {encoding: encoding, flag: 'r'}, (err, data) => {
				cb.call(err, data);
			});
		});
	}

	getStream(url) {
		if (!this._isUrlValid(url)) {
			return new Error(printf('Unable to handle url "%s" due to unsupported scheme', url));
		}

		let path = this.filePathForUrl(url);

		try {
			fs.accessSync(path, fs.R_OK);
		} catch(err) {
			return new Error(printf('Unable to read from %s', path));
		}

		let options = {};
		let stream = fs.createReadStream(path, options);
		if (!stream) {
			let err = new Error('Could not create stream');
			return err;
		}

		return stream;
	}

	post(data, options, callback) {
		let cb = new Callback(callback);
		let that = this;
		options = _.extend({
			encoding: 'utf-8',
			mode: 0o666
		}, options);


		let fileOptions = {encoding: options.encoding, mode: options.mode};
		let targetPath = that.pathForOptions(options);

		async.series([
			function createDirectoriesIfNeeded(doneS) {
				if (!that.options.createDirectories) {
					doneS();
				}

				let directory = path.dirname(targetPath);
				mkdirp(directory, (err) => {
					doneS(err);
				});
			},
			function writeFile(doneS) {
				fs.writeFile(targetPath, data, fileOptions, (err) => {
					if (err) {
						fs.unlink(targetPath, () => {
							doneS(err);
						});
						return;
					}
					doneS(err);
				});
			}
		], (err) => {
			if (err) {
				return cb.call(err, null);
			}

			let url = 'file://' + targetPath.substr(this.options.baseDirectory.length + 1);
			cb.call(null, url);
		});

	}

	postStream(options, callback) {
		let cb = new Callback(callback);
		let that = this;
		options = _.extend({
			encoding: 'utf-8',
			mode: 0o666
		}, options);

		let fileOptions = {encoding: options.encoding, mode: options.mode};
		let targetPath = that.pathForOptions(options);

		if (that.options.createDirectories) {
			let directory = path.dirname(targetPath);
			if (!fs.existsSync(directory)) {
				if (!mkdirp.sync(directory)) {
					// something went wrong
					cb.call(new Error(printf('Could not create directory %s', directory)), null);
					return null;
				}
			}
		}

		let stream = fs.createWriteStream(targetPath, fileOptions);

		let streamError = null;
		stream.on('error', (err) => {
			streamError = err;
			stream.end();
			fs.unlink(targetPath, (unlinkError) => {
				if (unlinkError && unlinkError.code !== 'ENOENT') {
					streamError.cleanupError = unlinkError;
				}
				cb.call(streamError, null);
			});
		});

		stream.on('finish', () => {
			if (!streamError) {
				let url = 'file://' + targetPath.substr(this.options.baseDirectory.length + 1);
				cb.call(null, url);
			}
		});

		return stream;
	}

	delete(url, callback) {
		let cb = new Callback(callback);

		let path = this.filePathForUrl(url);
		fs.unlink(path, (err) => {
			cb.call(err);
		});

	}

}

module.exports = MultiStorageLocal;