const { Duplex } = require('stream');
const kSource = Symbol('source');

class MyDuplex extends Duplex {
    constructor(socket, id, options) {
        super(options);
        this.id = id;
        this[kSource] = socket;
        // need wait socket emit `drain`
        this._needsocketdrain = false;
        // need wait duplex emit `drain`
        this._needselfdrain = false;

        const ondata = (chunk) => {
            if (!this.push(reverse(chunk))) {
                socket.pause();
            }
        };
        const ontimeout =  () => {
            this.emit('timeout');
        };
        const onerror = (e) => {
            this.emit('error', e);
        }

        socket.on('data', ondata);
        socket.on('timeout', ontimeout);
        socket.on('error', onerror);

        this.once('close', () => {
            socket.removeListener('data', ondata);
            socket.removeListener('timeout', ontimeout);
            socket.removeListener('error', onerror);
            socket.on('error', MyDuplex.NOOP);
            if (!socket.destroyed) {
                socket.destroy();
            }
        });

        socket.once('close', () => {
            if (!this.destroyed) {
                this.destroy();
            }
        });

        this.server = null;
    }

    write(chunk, encoding, callback) {
        let ret = Duplex.prototype.write.call(this, chunk, encoding, callback);
        if (!ret) {
            this._needselfdrain = true;
        }
        return ret && !this._needsocketdrain;
    }

    _write(chunk, encoding, callback) {
        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk);
        }
        let ret = this[kSource].write(reverse(chunk), encoding, callback);
        if (!ret) {
            this._needsocketdrain = true;
            this[kSource].once('drain', () => {
                this._needsocketdrain = false;
                this.emit('drain', true);
            });
        }
    }

    emit(event, ...args) {
        if (event === 'drain') {
            let isSocketDrain = args[0];
            if (isSocketDrain) {
                return this._needselfdrain ? hasListener('drain', this) : emitDrain(this);
            } else {
                this._needselfdrain = false;
                return this._needsocketdrain ? hasListener('drain', this) : emitDrain(this);
            }
        }
        return Duplex.prototype.emit.call(this, event, ...args);
    }

    _read(size) {
        this[kSource].resume();
    }

    setTimeout(...args) {
        this[kSource].setTimeout(...args);
        return this;
    }
}
MyDuplex.NOOP = () => {};

function emitDrain(stream) {
    return Duplex.prototype.emit.call(stream, 'drain');
}

function hasListener(eventName, emitter) {
    return emitter.listenerCount(eventName) > 0;
}

/**
 *
 *
 * @param {Buffer} chunk
 * @returns {Buffer}
 */
function reverse(chunk) {
    if (chunk === null){
        return null;
    }
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