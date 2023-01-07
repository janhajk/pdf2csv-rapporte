var fs = require('fs');
var config = require(__dirname + '/config.js');

exports.sort2D = require(__dirname + '/utils.sort.js').sort2D;



var date2timestamp = function(y, m, d, h, min, s) {
      return (new Date(y, m, d, h, min, s).getTime() / 1000);
};
exports.date2timestamp = date2timestamp;

var getFilesizeInBytes = function(filename) {
      return (fs.statSync(filename)).size;
};
exports.getFilesizeInBytes = getFilesizeInBytes;

/**
 * Log
 *
 * @param {String} log String to log; can also be object for dump
 * @param {String} type 'fatal'=always output, default=only in dev mode
 */

var log = function l(log, type) {
      if (log === '-') log = '------------------------------------------------------------------------------------------';
      else if (typeof log === 'string') {
            log = new Date().toLocaleString() + ': ' + log;
      }
      if (type === 'header') {
            l('-');
      }
      if (type === 'fatal') {
            console.log(log);
      }
      if (type === 'mysql') {
            console.log('There was an error in your mysql');
            console.log(log);
      }
      else if (config.dev) {
            console.log(log);
      }
      if (type === 'header') {
            l('-');
      }
};
exports.log = log;




/*
 *
 *
console.log('\x1b[36m%s\x1b[0m', 'I am cyan');  //cyan
console.log('\x1b[33m%s\x1b[0m', stringToMakeYellow);  //yellow

Note %s is where in the string (the second argument) gets injected.
\x1b[0m resets the terminal color so it doesn't continue to be the
chosen color anymore after this point.

Colors reference

Reset = "\x1b[0m"
Bright = "\x1b[1m"
Dim = "\x1b[2m"
Underscore = "\x1b[4m"
Blink = "\x1b[5m"
Reverse = "\x1b[7m"
Hidden = "\x1b[8m"

FgBlack = "\x1b[30m"
FgRed = "\x1b[31m"
FgGreen = "\x1b[32m"
FgYellow = "\x1b[33m"
FgBlue = "\x1b[34m"
FgMagenta = "\x1b[35m"
FgCyan = "\x1b[36m"
FgWhite = "\x1b[37m"

BgBlack = "\x1b[40m"
BgRed = "\x1b[41m"
BgGreen = "\x1b[42m"
BgYellow = "\x1b[43m"
BgBlue = "\x1b[44m"
BgMagenta = "\x1b[45m"
BgCyan = "\x1b[46m"
BgWhite = "\x1b[47m"


For example, \x1b[31m is an escape sequence that will be intercepted by your
terminal and instructs it to switch to the red color. In fact, \x1b is the code
for the non-printable control character escape. Escape sequences dealing only
with colors and styles are also known as ANSI escape code and are standardized,
so therefore they (should) work on any platform.

*/



var flatten = function(arr) {
      return arr.reduce(function(flat, toFlatten) {
            return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
      }, []);
};



const array2csv = function(data, delimiter = ';') {
      let file = "sep=;\n";

      // first format the numbers
      for (let i = 0; i < data.length; i++) {
            let keys = Object.keys(data[i]);
            for (let r = 0; r < keys.length; r++) {
                  if (typeof data[i][keys[r]] !== 'number') {
                        data[i][keys[r]] = '"' + data[i][keys[r]] + '"';
                  }
            }
      }

      // create lines
      for (let i = 0; i < data.length; i++) {
            let values = Object.values(data[i]);
            let line = values.join(delimiter);
            line += "\n";
            file += line;
      }
      return file;
};
exports.array2csv = array2csv;


const csvExport = function(res, allLines, filename) {
      let csv = array2csv(allLines);
      res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attchment; filename=' + filename + '.csv'
      });
      res.write('﻿' + csv);
      res.end();
};
exports.csvExport = csvExport;


const fileListSimple = function(files) {
      let list = [];
      for (let i = 0; i < files.length; i++) {
            list.push({
                  name: files[i][1].name,
                  path: files[i][1].path
            });
      }
      return list;
};
exports.fileListSimple = fileListSimple;
