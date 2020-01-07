const { Duplex } = require('stream');
const kSource = Symbol('source');

class MyDuplex extends Duplex {
    constructor(socket, id, options) {
        super(options);
        this.id = id;
        this[kSource] = socket;
        this._end = false;

        socket.on('data', chunk => {
            this.push(reverse(chunk));
        });

        socket.on('error', e => {
            this.emit('error', e);
        });

        socket.on('end', this.end.bind(this));

        ['setTimeout'].forEach(m => {
            this[m] = socket[m].bind(socket);
        });

        this.destroy = this.end;

        this.server = null;
    }

    on(event, ...rest) {
        if (!~['data', 'error'].indexOf(event)) {
            this[kSource].on(event, ...rest);
            return this;
        }
        return super.on(event, ...rest);
    }

    _write(chunk, encoding, callback) {
        if (this._end) return;
        return this[kSource].write(reverse(chunk), encoding, callback);
    }

    _read(size) {

    }

    end() {
        if (!this._end) {
            this._end = true;
            this[kSource].end();
            this.emit('end');
        }
    }
}

/**
 *
 *
 * @param {Buffer} chunk
 * @returns {Buffer}
 */
function reverse(chunk) {
    let bytelength = chunk.byteLength,
        index = 0;
    let arr = new Uint8Array(bytelength);
    while (index < bytelength) {
        let num = chunk.readUInt8(index);

        arr[index] = 255 - num;
        index++;
    }
    return Buffer.from(arr.buffer);
}

module.exports = MyDuplex;