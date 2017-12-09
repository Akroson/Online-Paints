class Sender {

	constructor(socket) {
		this._socket = socket;
	}

	createFrame(data, opt) {
		let playoud = data.length;
		let offset = 2;

		if (playoud > 65536) {
			playoud = 127;
			offset += 8;
		} else if (playoud > 125) {
			playoud = 126;
			offset += 2;
		}

		let frame = Buffer.allocUnsafe(data.length + offset);

		if (opt.fin) {
			frame[0] = 0x80 | opt.opcode;
		} else {
			frame[0] = opt.opcode;
		}

		frame[1] = playoud;

		if (playoud === 126) {
			frame.writeUInt16BE(data.length, 2, true);
		} else if (playoud === 127) {
			frame.writeUInt32BE(0, 2, true);
			frame.writeUInt32BE(data.length, 6, true);
		}
		
		data.copy(frame, offset);
		return frame;
	}

	send(data, send) {
		if (!Buffer.isBuffer(data)) {
			data = Buffer.from(data);

			const opt = {
				fin: true,
				opcode: 0x01
			}

			const frame = this.createFrame(data, opt);
			if (!send) return frame;
			else this._socket.write(frame);
		} else {
			if (send) this._socket.write(data);
		}
	}

	close(code) {
		let buf = Buffer.allocUnsafe(2);
		buf.writeUInt16BE(code, 0, true);

		const opt = {
			fin: true,
			opcode: 0x08
		}

		const frame = this.createFrame(buf, opt);
		this._socket.write(frame);
		this._socket = null;
	}
}

module.exports = Sender; 