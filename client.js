#!/usr/bin/env node
const client = require('./lib/localproxy');

const argv = require('yargs')
    .usage('Usage: --lp [local port] --ra [remote address] --rp [remote port] --pwd [password]')
    .default('lp', 4400)
    .default('rp', 4399)
    .string('pwd')
    .number(['lp', 'rp'])
    .check(args => {
        return !!args.pwd;
    })
    .demandOption(['ra', 'pwd'])
    .argv;

client(argv.lp, argv.ra, argv.rp, argv.pwd);