#!/usr/bin/env node
const server = require('./lib/remoteproxy');

const argv = require('yargs')
    .usage('Usage: --port [port] --pwd [password]')
    .default('port', 4399)
    .string('pwd')
    .number('port')
    .check(args=>{
        return !!args.pwd;
    })
    .demandOption(['pwd'])
    .argv;

server(argv.port, argv.pwd);