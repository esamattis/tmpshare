#!/usr/bin/env node
"use strict";

var express = require("express");
var path = require("path");
var http = require("http");
var argv = require('minimist')(process.argv.slice(2), {
    boolean: ["trust-proxy"],
    alias: {
        p: "port",
        h: "help",
        b: "base"
    }
});

var dir = argv._[0];

function help() {
    console.log("usage: " + path.basename(__filename) + " [--port=3000] [--base=/] [--trust-proxy] <dir>");
}

if (argv.help) {
    help();
    process.exit(0);
}

if (!dir) {
    help();
    process.exit(1);
}

var app = express();

if (argv["trust-proxy"]) {
    console.log("Trusting proxy");
    app.enable("trust proxy");
}

var tmpshare = require("./index")({dir: dir});

if (argv.base) {
    app.use(argv.base, tmpshare);
} else {
    app.use(tmpshare);
}

http.createServer(app).listen(argv.port || 3000, function(err) {
    if (err) throw err;
    var addr = this.address();
    console.log("Listening on http://localhost:%d", addr.port);
});
