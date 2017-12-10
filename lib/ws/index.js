const EventEmitter = require('events');
const url = require('url');
const crypto = require('crypto');

const debug = require('debug')('WSS:DEBAG');

const WebSoсket = require('./WebSoсket')
const Rooms = require('../router').rooms;

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class WebSocketServer extends EventEmitter {

	constructor(server) {
		super();

		this._server = server;
		this.rooms = {};
		this.ws = [];
		
		this._server.on('upgrade', (req, socket, head) => {
			this.doUpgrade(req, socket, head);
		})
	}

	doUpgrade(req, socket, head) {
		const reqHeadrs = req.headers;
		const version = +reqHeadrs['sec-websocket-version'];
		const path = this.checkPath(url.parse(req.url).pathname);

		if (
			!reqHeadrs['sec-websocket-key'] || 
			reqHeadrs.upgrade.toLowerCase() !== 'websocket' ||
			(version !== 8 && version !== 13) || !path
		) {
			this.abortConect(socket);
			return;
		}

		const protocol = (reqHeadrs['sec-websocket-protocol'] || '').split(/, */)[0];
		const hash = crypto.createHash('sha1')
			.update(reqHeadrs['sec-websocket-key'] + GUID, 'binari')
			.digest('base64');

		const headers = [
			'HTTP/1.1 101 Switching Ptotocols',
			'Upgrade: websocket',
			'Connection: upgrade'
		];

		headers.push(`Sec-Websocket-Accept: ${hash}`);
		if (protocol) headers.push(`Sec-Websocket-Protocol: ${protocol}`);
		headers.push('\r\n');

		socket.write(headers.join('\r\n'));

		let ip = socket.remoteAddress;
		const id = ip.slice(ip.indexOf(':', 4) + 1);
		const ws = new WebSoсket({
			attach: path,
			socket,
			id
		});

		ws.on('close', (id, path) => {
			if (typeof path === 'boolean') {
				const wsArr = this.ws;
				for (let i = wsArr.length - 1; i >= 0; i--) {
					if (id === wsArr[i].id) {
						wsArr.splice(i, 1);
						return;
					}
				}
			} else {
				this.deleteUser(id, path);
			}
		});

		this.addInRoomWs(ws, path, id);
		this.emit('connection', ws, req);
	}

	checkPath(path) {
		if (path.indexOf('room') !== -1) {
			const room = path.slice(path.indexOf('/', 2) + 1);
			if (Rooms[room]) return room;
			return false;
		} else if (path === '/') {
			return true;
		}

		return false;
	}

	addInRoomWs(ws, room, id) {
		if (typeof room === 'boolean') {
			this.ws.push(ws)
		} else {
			if (this.rooms.hasOwnProperty(room)) {
				const channel = this.rooms[room];
				for (var i = channel.length - 1; i >= 0; i--) {
					if (channel[i].id === id && !channel[i].admin) {
						channel[i].user = ws;
						return;
					}
				}
				ws.close(1000, true);
			} else {
				this.rooms[room] = [{user: ws, id: id, admin: true}];
			}
		}
	}
	
	broadcast(wsId, roomId, data) {
		const users = this.rooms[roomId];
		const length = users.length;
		if (length > 1) {
			for (let i = 0; i < length; i++) {

				//remove first check if you want try to paint and add check '&& users[i].admin'
				if (users[i].id !== wsId && typeof users[i].user === 'object') {
					users[i].user.send(data, true);
				}
			}
		}
	}

	deleteUser(id, path) {
		const room = this.rooms[path]
		const length = room.length;
		for (let i = 0; i < length; i++) {
			if (id === room[i].id) {
				if (i === 0 && length > 1) {
					room[1].admin = true;
					room.splice(0, 1);
				} else {
					room.splice(i, 1);
				}
				if (room.length === 0) delete this.rooms[path];
				return;
			}
		}

	}

	connectReq(wsId, roomCon) {

		//the first person in the room will always be the admin
		if (this.rooms[roomCon]) 
			this.rooms[roomCon][0].user.send(JSON.stringify({type: 'connect', u: wsId}), true);
	}

	confirmReq(uesrId, res, room) {
		if (res) {
			this.rooms[room].push({user: null, id: uesrId, admin: false})
			room = `/room/${room}`;
		}

		const wsArr = this.ws;
		const length = this.ws.length;
		for (let i = wsArr.length - 1; i >= 0; i--) {
			if (wsArr[i].id === uesrId) {
				wsArr[i].send(JSON.stringify({type: 'confirm', res: res, room: room}), true);
				return;
			}
		}
	}

	abortConect(socket) {
		if (socket.writable) {
			socket.write(
				'HTTP/1.1 400 Bad Request\r\n'+
				'Connection: close\r\n' + 
				'\r\n'
			)
		}

		socket.destroy();
	}
}

module.exports = WebSocketServer;
