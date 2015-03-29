"use strict";

var express = require("express");
var http = require("http");
var argv = require('minimist')(process.argv.slice(2), {
    alias: {
        p: "port",
        b: "base"
    }
});

var app = express();

var tmpshare = require("./index")({
    dir: argv._[0]
});

if (argv.base) {
    app.use(argv.base, tmpshare);
} else {
    app.use(tmpshare);
}

http.createServer(app).listen(argv.port || 3000, function(err) {
    if (err) throw err;
    var addr = this.address();
    console.log("Listening on http://%s:%d", addr.address, addr.port);
});
