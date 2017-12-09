const http = require('http');
const url = require('url');
const EventEmitter = require('events');

const WSServer = require('./lib/ws');
const routIndex = require('./lib/router');
const router = routIndex.router;
const rooms = routIndex.rooms;

router.setRoot(__dirname);
const server = http.createServer((req, res) => {
	if (req.method == 'GET') {
		router.handler(url.parse(req.url, true), req, res);
	}
});

const WS = new WSServer(server);

WS.on('connection', (ws, req) => {
	ws.on('message', (data) => {
		const message = JSON.parse(data);
		switch (message.type) {
			case 'paint':
				WS.broadcast(ws.id, ws.attach, ws.send(data, false));
				break;
			case 'connect':
				WS.connectReq(ws.id, message.r);
				break;
			case 'confirm':
				WS.confirmReq(message.u, message.res, message.room);
				break;
			case 'exclude':
				break;
		}
	})
})

server.listen(3000);