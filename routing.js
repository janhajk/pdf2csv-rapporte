// User Config File
var config = require(__dirname + '/config.js');

var utils = require(__dirname + '/utils.js');

var auth = require(__dirname + '/auth.js');


// System
var fs = require('fs');

// Middleware for Fileuploads
var formidable = require('formidable');


var basic = function(app, connection) {

    app.get('/',
        function(req, res) {
            res.render('home', { user: req.user });
        });

    app.get('/app', /*auth.ensureAuthenticated,*/ function(req, res) {
        fs.readFile(__dirname + '/public/app.html', 'utf-8', function(err, data) {
            res.send(data);
        });
    });



    app.post('/upload', /*auth.ensureAuthenticated,*/ function(req, res) {
        let gpg = require(__dirname + '/lib/rapporte.js');
        let form = new formidable.IncomingForm();
        let files = [];
        form.on('file', function(field, file) {
            files.push([field, file]);
        });
        form.parse(req, async function(err, fields, files1) {
            if (err) {
                console.log(err);
            }
            utils.log(fields.compare);
            files = utils.fileListSimple(files);


            // Just JSON representation of PDF
            if (fields.pdf2json) {
                let data = await gpg.pdf2jsonPages(files, fields);
                res.send(data);
            }

            // Compare
            else if (fields.compare) {
                gpg.compareAllPdfs(files, fields, 'V_', function(err, data) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        res.send(data);
                        res.end();
                    }
                });
            }

            // regular parsing
            else {
                if (files.length) {
                    let arrLines;
                    try {
                        arrLines = await gpg.pdf2jsonPages(files, fields);
                        let datum = arrLines[0].Datum;
                        datum = '20' + datum.split('.').reverse().join('-').substr(0, 5);
                        utils.csvExport(res, arrLines, datum + '_Zusammenzug');
                    }
                    catch (e) {
                        console.log(e);
                    }

                }
                else {
                    utils.log('No files sent!');
                }
            }
        });
    });



    // app.get('/asset/:aid', auth.ensureAuthenticated, function(req, res) {
    //     var aid = req.params.aid;
    //     var assets = require(__dirname + '/lib/assets.js');
    //     assets.get(aid, connection, function(e, data) {
    //         res.send(e ? e : data);
    //     });
    // });

};

exports.basic = basic;
