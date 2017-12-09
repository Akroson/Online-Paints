const EventEmitter = require('events');

const Sender = require('./Sender');
const Receiver = require('./Receiver');

class WebSoсket extends EventEmitter {

	constructor(obj) {
		super();

		this.id = obj.id;
		this.attach = obj.attach;
		this._socket = obj.socket;
		this._sender = null;
		this._receiver = null;

		this.initSocket();
	}

	initSocket() {
		this._socket.setNoDelay();
		this._socket.setTimeout(0);

		this._receiver = new Receiver();
		this._sender = new Sender(this._socket);

		this._socket.on('data', (data) => {
			this._receiver.add(data);
		})

		this._receiver.onmessage = (data) => this.emit('message', data);
		this._receiver.onclose = (code) => this.close(code);
		//this._receiver.onerror = () => this.doCloes(code);
	}

	send(data, create) {
		if (this._socket.writable) {
			return this._sender.send(data, create);
		}
	}

	close(code, error) {
		if (error) this._sender.close(code);
		this._socket.destroy();
		this._socket = null;
		this._sender = null;
		this.emit('close', this.id, this.attach);
		this.removeAllListeners();
		this._receiver.clean();
		this._receiver = null
	}

}

module.exports = WebSoсket; 