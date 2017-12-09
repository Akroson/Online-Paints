const crypto = require('crypto');
const debug = require('debug')('router:index');
const Router = require('./Router');
const router = new Router();

const Rooms = {};

router.addGetRout('^/$', '/public/template/index.html');
router.addGetRout('^/room/[a-z0-9]{16}$', (req, res, url) => {
	const pathName = url.pathname;
	const roomId = pathName.slice(pathName.indexOf('/', 2) + 1);
	if (Rooms[roomId]) {
		router.sendFile('/public/template/room.html', res);
	} else {
		res.statusCode = 404;
		res.end('Room not exist');
	}
	
});

router.addGetRout('^/create-room$', (req, res, url) => {
	let roomId = createRoomId();
	while (1) {
		if (Rooms[roomId]) {
			roomId = createRoomId();
		} else {
			let roomUrl = `/room/${roomId}`;
			Rooms[roomId] = 1;
			res.end(JSON.stringify({res: true, room: roomUrl, message: null}))
			return;
		}
	}
})

// router.addGetRout('^/join-room$', (req, res, url) => {
// 	const roomId = url.query.roomid
// 	if (Rooms[roomId]) {
// 		const roomUrl = `/room/${roomId}`;
// 		res.end(JSON.stringify({res: true, room: roomUrl, message: null}))
// 	} else {
// 		res.end(JSON.stringify({res: false, room: null, message: `Room ${roomId} not exist`}))
// 	}
// })

function createRoomId() {
	return crypto.randomBytes(8).toString('hex');
}

exports.router = router;
exports.rooms = Rooms;