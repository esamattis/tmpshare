"use strict";

var Promise = require("bluebird");
var express = require("express");
var path = require("path");
var moment = require("moment");
var fs = require("fs");
var crypto = require("crypto");
var mime = require("mime");
var algorithm = 'aes-256-ctr';
var url = require("url");
var multiparty = require("multiparty");
var sanitize = require("sanitize-filename");
var stream = require("stream");

var randomBytes = Promise.promisify(crypto.randomBytes);
var stat = Promise.promisify(fs.stat);
var unlink = Promise.promisify(fs.unlink);


module.exports = function(config) {
    var testFile = path.join(config.dir, "share-once-test-file");
    fs.writeFileSync(testFile, "just testing");
    fs.unlinkSync(testFile);

    var app = express.Router();


    app.get("/", function(req, res, next) {
        var currentURL = url.format({
            host: req.headers.host,
            protocol: req.protocol,
            pathname: req.originalUrl
        });

        res.render("form.ejs", {
            currentURL: currentURL
        });


    });


    function writeStream(stream) {
        return Promise.join(
            randomBytes(5),
            randomBytes(20)
        ).spread(function(fileId, key) {
            key = key.toString("hex");
            fileId = moment().format("YYYY-MM-DD-HH-mm-") + fileId.toString("hex");
            var filePath = path.join(config.dir, fileId);

            return new Promise(function(resolve, reject){
                stream.on("error", reject)
                .pipe(crypto.createCipher(algorithm, key))
                .pipe(fs.createWriteStream(filePath))
                .on("error", reject)
                .on("close", resolve);
            })
            .then(function() {
                return {fileId: fileId, key: key};
            });
        });
    }

    function handleMultipart(req, res, next) {
        var form = new multiparty.Form();
        var files = [];

        form.on("error", function(err) {
            res.status(500).send("Bad form");
        });

        form.on("part", function(part) {
            if (!part.filename) {
                part.resume();
            }
            files.push(writeStream(part, part.filename).then(function(info) {
                return createPreviewURL(req, info, part.filename);
            }));
        });

        form.on("close", function() {
            Promise.all(files).then(function(previewURLs) {
                if (previewURLs.length === 1) {
                    res.header("Location", previewURLs[0]);
                    return res.status(301).send(previewURLs[0] + "\n");
                }

                if (/^curl/.test(req.headers["user-agent"])) {
                    return res.send(previewURLs.join("\n") + "\n");
                }

                res.render("list.ejs", { previewURLs: previewURLs });
            })
            .catch(next);
        });

        form.parse(req);

    }


    app.post("/", function(req, res, next) {
        if (!req.body.content) return handleMultipart(req, res, next);
        var filename = req.body.filename || "unnamed.txt";

        var s = new stream.Readable();
        s._read = function noop() {};
        s.push(req.body.content);
        s.push(null);

        writeStream(s, filename)
        .then(function(info) {
            res.redirect(createPreviewURL(req, info, filename));
        })
        .catch(next);

    });


    function createPreviewURL(req, info, filename) {
        return url.format({
            host: req.headers.host,
            protocol: req.protocol,
            pathname: req.baseUrl + "/download/" + info.fileId + "/" + sanitize(filename)
        }) + "#" + info.key;
    }

    app.put("/:filename", function(req, res, next) {
        writeStream(req, req.params.filename)
        .then(function(info) {
            res.send(createPreviewURL(req, info, req.params.filename) + "\n");
        })
        .catch(next);
    });


    app.get("/download/:fileId/:filename", function(req, res, next) {
        var downloadURL = url.format({
            host: req.headers.host,
            protocol: req.protocol,
            baseUrl: req.baseUrl,
            pathname: req.originalUrl
        });

        res.render("download.ejs", {
            filename: req.params.filename,
            baseUrl: req.baseUrl || "/",
            downloadURL: downloadURL
        });
    });

    app.post("/download/:fileId/:filename", function(req, res, next) {
        var filePath = path.join(config.dir, sanitize(req.params.fileId));
        stat(filePath)
        .then(function() {
            return new Promise(function(resolve, reject){
                res.header("content-type", mime.lookup(req.params.filename));
                res.header("content-disposition", "attachment; filename=" + req.params.filename);

                fs.createReadStream(filePath)
                .on("end", function() {
                    resolve(unlink(filePath));
                })
                .on("error", reject)
                .pipe(crypto.createDecipher(algorithm, req.body.key))
                .on("error", reject)
                .pipe(res)
                .on("error", reject);
            });
        })
        .catch(function(err) {
            if (err.code === "ENOENT") {
                res.status(404).send("not found or already downloaded\n");
            } else {
                next(err);
            }
        });

    });


    return app;
};
