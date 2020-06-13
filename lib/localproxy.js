const net = require('net');
const Duplex = require('./duplex');

const noop = () => { };

module.exports = function (localport, remoteaddress, remoteport, password) {
    net.createServer(cltSocket => {
        let srvSocket = net.connect({
            host: remoteaddress,
            port: remoteport,
        }, async () => {
            let ret = await login(duplex, password).catch(e => false);
            if (ret !== true) {
                duplex.end();
                return;
            }
            cltSocket.pipe(duplex);
            duplex.pipe(cltSocket);
        });
        let duplex = new Duplex(srvSocket, 'local');

        const onDuplexEnd = () => {
            cltSocket.end();
            duplex.removeListener('end', onDuplexEnd);
            duplex.removeListener('error', onDuplexEnd);
            duplex.on('error', noop);
        };
        const onCltSocketEnd = () => {
            duplex.end();
            cltSocket.removeListener('end', onCltSocketEnd);
            cltSocket.removeListener('error', onCltSocketEnd);
            cltSocket.on('error', noop);
        };

        duplex
            .on('error', onDuplexEnd)
            .once('end', onDuplexEnd);
        cltSocket
            .on('error', onCltSocketEnd)
            .once('end', onCltSocketEnd);
    }).listen(localport);
}

function login(duplex, password) {
    duplex.write(`password\r\n${password}\r\n\r\n`);
    let result = '';
    let p = new Promise((resolve, reject) => {
        let timer = setTimeout(() => {
            duplex.emit('error', new Error('auth timeout!'));
        }, 10000);

        const ondata = chunk => {
            result += chunk.toString();
            let index = result.indexOf('\r\n\r\n');
            if (!!~index) {
                clearTimeout(timer);
                result = result.substring(0, index);
                if (result === 'success') {
                    resolve(true);
                    removeListeners();
                }
                else {
                    duplex.emit('error', new Error('auth failed!'));
                }
            }
        };
        const onError = e => {
            reject(e);
            removeListeners();
        };

        const onEnd = onError;

        const removeListeners = () => {
            duplex
                .removeListener('data', ondata)
                .removeListener('error', onError)
                .removeListener('end', onEnd);
        };
        duplex
            .on('error', onError)
            .once('end', onEnd)
            .on('data', ondata);
    });

    return p;
}