const http = require('http');
const net = require('net');
const url = require('url');
const Duplex = require('./duplex');

function createServer(port, password, bridgePort) {
    const server = net.createServer(cltSocket => {
        cltSocket.setKeepAlive(true, 30000);

        let duplex = new Duplex(cltSocket, 'remote');

        let srvSocket = net.createConnection(bridgePort, '127.0.0.1', async () => {
            let ret = await auth(duplex, password).catch(e => false);
            if (ret !== true) {
                duplex.end();
                return;
            }

            duplex.pipe(srvSocket);
            srvSocket.pipe(duplex);
        });

        let endAll = e => {
            srvSocket.end();
            duplex.end();
        }

        srvSocket
            .on('error', endAll)
            .once('end', endAll);
        duplex
            .on('error', endAll)
            .once('end', endAll);
    })


    server.listen(port);
}

function createBridge(port, password) {
    const server = net.createServer(socket => {
        socket.setKeepAlive(true, 30000);

        proxy.emit('connection', socket);
    })

    server.listen(() => {
        let { port: bridgePort } = server.address();
        createServer(port, password, bridgePort)
    })
}

const agentOptions = {
    keepAlive: true,
}

const agent = new http.Agent(agentOptions);

// Create an HTTP tunneling proxy
const proxy = http.createServer((req, res) => {
    let needproxy = /^http:\/\//.test(req.url);
    if (!needproxy) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('okay');
        return;
    }

    let urlObj = url.parse(req.url);

    let __req = http.request({
        ...urlObj,
        host: urlObj.hostname,
        method: req.method,
        agent,
        headers: req.headers,
    }, __res => {
        __res.on('error', onError);
        __res.pipe(res);
        res.statusCode = __res.statusCode;
        for (let h in __res.headers) {
            res.setHeader(h, __res.headers[h])
        }
    });
    const onError = e => {
        res.statusCode = 500;
        res.end(e && e.message);
    }

    req.pipe(__req);

    __req.on('error', onError);
});
proxy.on('connect', (req, cltSocket, head) => {
    // connect to an origin server
    const srvUrl = url.parse(`http://${req.url}`);
    // console.log(req.url)
    const srvSocket = net.connect(srvUrl.port || 80, srvUrl.hostname, () => {
        cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' +
            '\r\n');
        srvSocket.write(head);
        srvSocket.pipe(cltSocket);
        cltSocket.pipe(srvSocket);
    });
    let endAll = () => {
        srvSocket.end();
        cltSocket.end();
    }

    cltSocket
        .on('error', endAll)
        .once('end', endAll);
    srvSocket
        .on('error', endAll)
        .once('end', endAll);
});

function auth(duplex, password) {
    let result = '';
    let p = new Promise((resolve, reject) => {
        const removeListeners = () => {
            duplex
                .removeListener('error', reject)
                .removeListener('end', reject);
        }

        duplex
            .on('error', reject)
            .once('end', reject);

        setTimeout(() => {
            reject();
            removeListeners();
        }, 20000);

        const ondata = chunk => {
            result += chunk.toString();
            let index = result.indexOf('\r\n\r\n');
            if (!!~index) {
                duplex.removeListener('data', ondata);

                result = result.substring(0, index);
                result = result.split('\r\n')[1];
                if (result === password) {
                    duplex.write('success\r\n\r\n', () => resolve(true));
                    removeListeners();
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

module.exports = createBridge;