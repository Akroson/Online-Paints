const fs = require('fs');
const mimeType = {
	'html': 'text/html',
	'css': 'text/css',
	'js': 'text/javascript',
	'jpeg': 'image/jpeg',
	'jpg': 'image/jpeg',
	'png': 'image/phg',
}

class Router {

	constructor() {
		this.ROOT = null;
		this.getRout = {};
	}

	setRoot(dir) {
		this.ROOT = dir;
	}

	addGetRout(template, val) {
		this.getRout[template] = val;
	}

	handler(url, req, res) {
		const pathName = url.pathname;
		if (pathName.indexOf('/public/') !== -1) {
			this.sendFile(pathName, res);
		} else {
			const routs = this.getRout;
			for (let key in routs) {
				if (pathName.match(key)) {
					const objReq = routs[key];
					if (typeof objReq === 'function') {
						objReq(req, res, url);
					} else if (typeof objReq === 'string') {
						this.sendFile(objReq, res);
					}
					return;
				}
			}

			res.statusCode = 500;
			res.end('Server Error');
		} 	
	}

	sendFile(filePath, res) {
		const fullPath = this.ROOT + decodeURIComponent(filePath);
		fs.stat(fullPath,  (err, stat) => {
			if(err || !stat.isFile()) {
				res.statusCode = 404;
				res.end('File not found');
			}
			const rstream = fs.createReadStream(fullPath);
			res.setHeader('Content-Type', setType(filePath));
			rstream
				.on('close', () => {
					res.end();
				})
				.on('error', () => {
					res.statusCode = 500;
					res.end('Server Error');
				})
			rstream.pipe(res);
		})
	}
}

function setType(path) {
	const name = path.slice(path.indexOf('.') + 1);
	return mimeType[name];
}

module.exports = Router;