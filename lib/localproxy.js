const net = require('net');
const Duplex = require('./duplex');

module.exports = function (localport, remoteaddress, remoteport, password) {
    net.createServer(cltSocket => {
        let duplex = new Duplex(cltSocket, 'local');

        let srvSocket = net.connect({
            host: remoteaddress,
            port: remoteport,
        }, async () => {
            let ret = await login(srvSocket, password).catch(e => false);
            if (ret !== true) {
                duplex.end();
                return;
            }

            duplex.pipe(srvSocket);
            srvSocket.pipe(duplex);
        });
        let endAll = e => {
            // e ? console.log(e.message) : null;
            srvSocket.end();
            duplex.end();
        }

        srvSocket
            .on('error', endAll)
            .once('end', endAll);
        duplex
            .on('error', endAll)
            .once('end', endAll);
    }).listen(localport);
}

function login(socket, password) {
    let duplex = new Duplex(socket, 'login');
    duplex.on('error', duplex.end.bind(duplex));
    duplex.write(`password\r\n${password}\r\n\r\n`);

    let result = '';
    let p = new Promise((resolve, reject) => {
        duplex
            .once('error', reject)
            .once('end', reject);

        const ondata = chunk => {
            result += chunk.toString();
            let index = result.indexOf('\r\n\r\n');
            if (!!~index) {
                result = result.substring(0, index);
                duplex.removeListener('data', ondata);
                if (result === 'success') {
                    resolve(true);
                    duplex
                        .removeListener('error', reject)
                        .removeListener('end', reject);
                }
                else {
                    reject();
                }
            }
        }

        duplex.on('data', ondata)
    });

    return p;
}