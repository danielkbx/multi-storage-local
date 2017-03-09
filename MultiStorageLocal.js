'use strict';

let _ = require('underscore');
let path = require('path');
let fs = require('fs');
let URL = require('url');
let printf = require('util').format;
var mkdirp = require('mkdirp');

class MultiStorageLocal {

	constructor(options) {
		this.options = _.extend({
			createDirectories: true,
			flattenDirectories: false,
			baseDirectory: path.join(process.cwd(), 'multi-storage-local')
		}, options);

		this.manager = null;
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

		if (_.isNull(url) || _.isUndefined(url)) {
			return null;
		}

		if (!_.isString(url)) {
			if (_.isObject(url)) {
				url = URL.format(url);
				if (!url) {
					return null;
				}
			} else {
				return null;
			}
		}

		if (!url.startsWith('file://')) {
			return null;
		}

		if (url.length <= 'file://'.length) {
			return null;
		}

		let relativePath = url.substring('file://'.length);
		relativePath = decodeURIComponent(relativePath);

		if (this.options.flattenDirectories) {
			relativePath = this.flattenedPathForPath(relativePath);
		}

		let absolutePath = path.join(this.options.baseDirectory, relativePath);

		return absolutePath;
	}

	urlForFilePath(targetPath) {
		if (!_.isString(targetPath) || targetPath.length < this.options.baseDirectory.length) {
			return null;
		}

		let relativePath = path.relative(this.options.baseDirectory, targetPath);
		let url = 'file://' + relativePath; // targetPath.substr(this.options.baseDirectory.length + 1);
		return encodeURI(url);
	}

	getStream(url) {
		if (!this._isUrlValid(url)) {
			return Promise.reject(new Error(printf('Unable to handle url "%s" due to unsupported scheme', url)));
		}

		return new Promise((resolve, reject) => {
			let path = this.filePathForUrl(url);
			fs.access(path, fs.R_OK, err => (err) ? reject(err) : resolve(path));
		}).then((path) => {
			return new Promise((resolve, reject) => {
				let stream = fs.createReadStream(path, {});
				if (!stream) {
					reject(new Error(printf('Could not create stream for path %s', path)));
				} else {
					resolve(stream);
				}
			});
		});
	}


	postStream(options) {
		let that = this;
		options = _.extend({
			encoding: 'utf-8',
			mode: 0o666
		}, options);

		let fileOptions = {encoding: options.encoding, mode: options.mode};
		let targetPath = that.pathForOptions(options);

		return new Promise((resolve, reject) => {
			if (!that.options.createDirectories) {
				return resolve();
			}

			let directory = path.dirname(targetPath);
			if (fs.existsSync(directory)) {
				return resolve();
			}

			if (that.manager) {
				that.manager._debug('Creating directory "%s"', directory);
			}
			mkdirp(directory, (err) => {
				if (err) {
					reject(new Error(printf('Could not create directory %s', directory)));
				} else {
					resolve();
				}
			});
		})
			.then(() => {
				// create the file, this way we can reject the promise if the file cannot be created
				return new Promise((resolve, reject) => {
					fs.open(targetPath, 'w', (err, fd) => (err) ? reject(err) : resolve(fd));
				});
			})
			.then((fd) => {
				fileOptions.fd = fd;
				let stream = fs.createWriteStream(null, fileOptions);
				if (!stream) {
					return Promise.reject(new Error(printf('Could not create writable stream at "%s"', targetPath)));
				}
				stream.on('error', (err) => {
					if (that.manager) {
						that.manager._error('Failed to write stream to "%s"', targetPath);
					}
					stream.end();
					fs.unlink(targetPath, (unlinkError) => {
						if (unlinkError && that.manager) {
							that.manager._error('Failed to remove file fragment at %s after an error occured during writing.', targetPath);
						}
					});
				});
				stream.on('close', () => {
					if (that.manager) {
						that.manager._debug('Stream for "%s" closed, %d bytes written', targetPath, stream.bytesWritten);
					}
				});
				stream.url = that.urlForFilePath(targetPath);
				return Promise.resolve(stream);
			});
	}

	delete(url) {
		let manager = this.manager;
		return new Promise((resolve, reject) => {
			let path = this.filePathForUrl(url);
			fs.unlink(path, (err) => {
				if (err && err.code === 'ENOENT') {
					if (manager) {
						manager._debug(printf('Failed to delete %s, ignoring the error since we wanted to delete it.', url));
					}
					err = null;
				}
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

}

module.exports = MultiStorageLocal;