const http = require('http');
const net = require('net');
const url = require('url');
const Duplex = require('./duplex');
const timeout = 1000 * 30;

const noop = Duplex.NOOP;

function createServer(port, password) {
    const server = net.createServer(async cltSocket => {
        closeOnTimeout(cltSocket, timeout);

        let duplex = new Duplex(cltSocket, 'remote');
        const onerror = e => {
            duplex.destroy();
        };
        const onend = () => {
            duplex.removeListener('error', onerror);
            duplex.removeListener('close', onend);
            duplex.on('error', noop);
        };
        duplex.on('error', onerror);
        duplex.on('close', onend);
        let ret = await auth(duplex, password).catch(e => false);
        if (ret !== true) {
            duplex.destroy();
            return;
        }
        proxy.emit('connection', duplex);
    });

    server.listen(port);
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
        __res.pipe(res);
        res.writeHead(__res.statusCode, __res.headers);
    });
    const onError = e => {
        res.statusCode = 500;
        res.end(e && e.message);
        __req.removeListener('error', onError);
        __req.on('error', noop);
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

        closeOnTimeout(srvSocket, timeout);
        closeOnTimeout(cltSocket, timeout);
    });

    const onSrvSocketEnd = () => {
        cltSocket.destroy();
        srvSocket.removeListener('close', onSrvSocketEnd);
        srvSocket.removeListener('error', onSrvSocketEnd);
        srvSocket.on('error', noop);
    };
    const onCltSocketEnd = () => {
        srvSocket.destroy();
        cltSocket.removeListener('close', onCltSocketEnd);
        cltSocket.removeListener('error', onCltSocketEnd);
    };

    cltSocket
        .on('error', onCltSocketEnd)
        .once('close', onCltSocketEnd);
    srvSocket
        .on('error', onSrvSocketEnd)
        .once('close', onSrvSocketEnd);
});

function auth(duplex, password) {
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
                duplex.removeListener('data', ondata);

                result = result.substring(0, index);
                result = result.split('\r\n')[1];
                if (result === password) {
                    duplex.write('success\r\n\r\n', () => {
                        resolve(true);
                        removeListeners();
                    });
                }
                else {
                    duplex.emit('error', new Error('invalid password!'));
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
                .removeListener('close', onEnd);
        };

        duplex
            .on('error', onError)
            .on('data', ondata)
            .once('close', onEnd);

    });

    return p;
}

const closeOnTimeout = (socket, ms, cb) => {
    socket.setTimeout(ms);
    socket.once('timeout', () => socket.destroy());
}

module.exports = createServer;