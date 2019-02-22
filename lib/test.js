const crypto = require('crypto');
const fs = require('fs');
const net = require('net');

const algorithm = 'aes-192-cbc';
const password = 'Password used to generate key';
// Use the async `crypto.scrypt()` instead.
const key = crypto.scryptSync(password, 'salt', 24);
// Use `crypto.randomBytes()` to generate a random iv instead of the static iv
// shown here.
const iv = Buffer.alloc(16, 0); // Initialization vector.

// const cipher = crypto.createCipheriv(algorithm, key, iv);
// const decipher = crypto.createDecipheriv(algorithm, key, iv);

// const input = fs.createReadStream('1.pdf');
// const output = fs.createWriteStream('2.pdf');

net.createServer(socket => {
    socket.on('data', chunk => {
        let bytelength = chunk.byteLength,
            index = 0;

        let arr = new Uint8Array(bytelength);
        while (index < bytelength) {
            let num = chunk.readUInt8(index);

            arr[index] = 255 - num;
            index++;
        }
        output.write(Buffer.from(arr.buffer));
    })
}).listen(10000);

net.createServer(socket => {
    //socket.setEncoding('binary');
    let s = net.createConnection({ port: 10000, host: 'localhost' }, () => {
        socket.on('data', chunk => {

            //let encrypted = cipher.update(chunk, 'binary', 'hex');
            // encrypted += cipher.final('hex');
            //s.write(encrypted);

            let bytelength = chunk.byteLength,
                index = 0;
            let arr = new Uint8Array(bytelength);
            while (index < bytelength) {
                let num = chunk.readUInt8(index);

                arr[index] = 255 - num;
                index++;
            }
            s.write(Buffer.from(arr.buffer),()=>{
                console.log(arr.buffer.length);
            });
        })
    });
}).listen(9999);

let s = net.createConnection({ port: 9999, host: 'localhost' }, () => {
    s.end();
    s.end();
    s.write('111')
    // try{
    //     s.write('1111')
    // }catch(e){
    //     console.log(e.message)
    // }
})

s.on('error',e=>{
    console.log(e.message)
})

