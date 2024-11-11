// User Config File
var config = require(__dirname + '/../config.js');

var utils = require(__dirname + '/../utils.js');

var PDFParser = require('pdf2json');
var async = require('async');




let jsonOutput = function(files, cb) {
      cb(null, {});
};
exports.jsonOutput = jsonOutput;
