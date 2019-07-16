const http = require('http');
const net = require('net');
const url = require('url');
const Duplex = require('./duplex');
const timeout = 1000 * 30;

function createServer(port, password) {
    const server = net.createServer(async cltSocket => {
        closeOnTimeout(cltSocket, timeout);

        let duplex = new Duplex(cltSocket, 'remote');
        let ret = await auth(duplex, password).catch(e => false);
        if (ret !== true) {
            duplex.end();
            return;
        }
        duplex.on('error', e => duplex.end());
        proxy.emit('connection', duplex);
    })


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

        closeOnTimeout(srvSocket, timeout);
        closeOnTimeout(cltSocket, timeout);
    });
    let endAll = () => {
        srvSocket.end();
        cltSocket.end();
    }

    cltSocket
        .on('error', endAll)
        .once('close', endAll);
    srvSocket
        .on('error', endAll)
        .once('close', endAll);
});

function auth(duplex, password) {
    let result = '';
    let p = new Promise((resolve, reject) => {
        const removeListeners = () => {
            duplex
                .removeListener('data', ondata)
                .removeListener('error', reject)
                .removeListener('close', reject);
        }

        duplex
            .on('error', reject)
            .once('close', reject);

        let timer = setTimeout(() => {
            reject();
            removeListeners();
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

const closeOnTimeout = (socket, ms, cb) => {
    socket.setTimeout(ms);
    socket.on('timeout', () => socket.end());
}

module.exports = createServer;