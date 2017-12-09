const isValidUTF8 = require('utf-8-validate');

const VALID = 1;
const GET_DATA = 2;

class Receiver {

	constructor() {
		this._maxPlayoud = 1024 * 1024 * 0.5;
		this._recPlayoud = null;
		this._sumPlayoud = 0;

		this._buffer = [];
		this._fragment = [];

		this._fragOpcode = null;	
		this._opcode = null;
		this._masked = null;
		this._fin = null;

		this._loop = false;
		this._stateParse = VALID;

		this.onmessage = null;
		this.onclose = null;
		this.onerror = null;
	}

	add(data) {
		this._buffer.push(data);
		if (!this._loop) this.parseLoop();
	}

	parseLoop() {
		this._loop = true;

		while (this._loop) {
			switch (this._stateParse) {
				case VALID:
					this.validData();
					break;
				case GET_DATA:
					this.getData();
					break;
			}
		}
	}

	validData() {
		if (!this._buffer[0]) {
			this._loop = false;
			return;
		}

		const bytes = this.getBytes(2);

		if ((bytes[0] & 0x70) !== 0x00 || (bytes[1] & 0x80) !== 0x80) {
			this.onclose(1002, true);
		}

		this._fin = (bytes[0] & 0x80) === 0x80;
		this._opcode = bytes[0] & 0x0f;

		if (this._opcode === 0x00) {
			if (!this._fragOpcode) this.onclose(1002, true);
			else this._opcode = this._fragOpcode;
		}

		if (this._opcode > 0x07 && this._opcode < 0x0b) {
			if (!this._fin) this.onclose(1002, true);
		} else if (this._opcode === 0x02) {
			this.onclose(1003, true);
		}

		this._recPlayoud = bytes[1] & 0x7f;

		let checkLength = null;
		if (this._recPlayoud === 126) checkLength = 2;
		else if (this._recPlayoud === 127) checkLength = 8;
		else this._masked = this.getBytes(4);
		
		if (checkLength !== null) {
			if (!this.checkPlayoud(checkLength)) 
				this.onclose(1009, true);
		}

		if (!this._fin && this._fragOpcode) this._fragOpcode = this.opcode;

		this._stateParse = GET_DATA;
	}

	getBytes(n) {
		if (n === this._buffer[0].length) {
			return this._buffer.shift();
		} else if (n < this._buffer[0].length) {
			const data = this._buffer[0].slice(0, n);
			this._buffer[0] = this._buffer[0].slice(n);
			return data;
		}
	}

	checkPlayoud(n) {
		if (n === 2) {
			this._recPlayoud = this.getBytes(2).readUInt16BE(0, true);
		} else if (n === 8) {
			let buf = this.getBytes(8);
			let num = buf.readUInt32BE(0, true);

			if (num > Math.pow(2, 53 - 32) - 1) return false;

			this._recPlayoud = (num * Math.pow(2, 32)) + buf.readUInt32BE(4, true);
		}

		if (this._recPlayoud > this._maxPlayoud)
			return false;

		return true;
	}

	getData() {
		if (this._masked === null) {
			this._masked = this.getBytes(4);
		}

		let data = this.getBytes(this._recPlayoud);
		this.unmack(data, this._masked);
		if (this._opcode > 0x07) {
			this.controlMessage(data);
		} else {
			this.pushFragment(data);
			this.dataMessage();
		}

	}

	dataMessage() {
		if (this._fin) {
			const data = this.concatFragment(this._fragment, this._sumPlayoud);

			if (!isValidUTF8(data)) {
				this.onclose(1003, true);
			}

			this._fragment = [];
			this._fragOpcode = null
			this._sumPlayoud = null
			this._recPlayoud = null;
			this._opcode = null;
			this._masked = null;
			this._fin = null;
			this._loop = false;

			this.onmessage(data.toString());
		}

		this._stateParse = VALID;
	}

	controlMessage(data) {
		if (this._opcode === 0x08) {
			this.onclose(1000, false);
		}
	}

	pushFragment(fragment) {
		this._sumPlayoud += fragment.length;

		if (this._sumPlayoud <= this._maxPlayoud) {
			this._fragment.push(fragment);
		} else {
			this.onclose(1009, true);
		}
	}

	concatFragment(data, length) {
		if (data.length === 1 && data.length !== 0) return data[0];
		else return Buffer.concat(data, length);
	}

	unmack(data, mask) {
		const length = data.length;
		for (let i = 0; i < length; i++) {
			data[i] ^= mask[i & 3];
		}
	}

	//error() {}

	clean() {
		this._maxPlayoud = null;
		this._recPlayoud = null;
		this._sumPlayoud = null;
		this._buffer = null;
		this._fragment = null;
		this._fragOpcode = null;	
		this._opcode = null;
		this._masked = null;
		this._fin = null;
		this._loop = null;
		this._stateParse = null;
		this.onmessage = null;
		this.onclose = null;
		this.onerror = null;
	}
}

module.exports = Receiver