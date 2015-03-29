"use strict";

var express = require("express");
var http = require("http");
var bodyParser = require('body-parser');
var argv = require('minimist')(process.argv.slice(2), {
    alias: {
        p: "port"
    }
});

var app = express();

app.use(bodyParser());

app.use(require("./index")({
    dir: argv._[0]
}));

http.createServer(app).listen(argv.port || 3000, function(err) {
    if (err) throw err;
    var addr = this.address();
    console.log("Listening on http://%s:%d", addr.address, addr.port);
});
