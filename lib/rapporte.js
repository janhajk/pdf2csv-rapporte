/**
 *
 *    implement
 *
      https://www.npmjs.com/package/string-similarity
      https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Asynchronously_handling_the_file_upload_process




      TODO:
      Output directly to XLSM with:
      https://github.com/sheetjs/sheetjs

*/


let async = require('async');

var utils = require(__dirname + '/../utils.js');

const contentThresold = 0.8; // How much perecnt of cols per row must be used to make it a valid row (default: 0.4)



const HEADER = ['Datei', 'Seite', 'GL/Na/ZL', 'Planer', 'Name', 'Datum', 'Kat.', 'Tätigkeitsbeschrieb', 'Std.'];



/**
 *
 *
 * Parse a pdf into json object
 *
 *
 * @returns {Promise} allLines: JSON Object of pdf
 *
 *
 *
 *
 */
const pdf2jsonPages = function(files, params) {
      let fileFunctions = [];
      let PDFParser = require('pdf2json');

      // Create array for async to parse each PDF individualy
      for (let file of files) {
            const fn = function(file) {
                  return function(callback) {
                        console.log(file.name);
                        let pdfParser = new PDFParser();
                        pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
                        // Callback Function
                        pdfParser.on('pdfParser_dataReady', function(pdfData) {
                              callback(null, { data: pdfData, file: file });
                        });
                        pdfParser.loadPDF(file.path);
                  };
            }(file);
            fileFunctions.push(fn);
      }
      return new Promise((resolve, reject) => {
            console.log('parsing pdfs:');
            // parallel process all files
            // see https://caolan.github.io/async/v3/docs.html#parallelLimit
            async.parallelLimit(fileFunctions, 10,
                  // callback with all data from all files
                  // format of data: [{data, file}, ...]
                  function(err, data) {
                        if (err) {
                              console.log('There was an error in async!');
                              console.log(err);
                              return reject(err);
                        }
                        console.log('successfully parsed all pdfs. Now processing all data...');
                        // variable that contains all files
                        let allFiles = {};

                        for (let i = 0; i < data.length; i++) {
                              allFiles[data[i].file.name] = data[i].data.formImage.Pages;
                        }
                        console.log('finished seperating all files. Number of files: ' + Object.keys(allFiles).length);

                        allFiles = remapData(allFiles);
                        allFiles = sortByPageThenY(allFiles);
                        allFiles = groupContentByLines(allFiles);
                        // allFiles = sortByX(allFiles);
                        allFiles = removePagesBeforeDataStarts(allFiles);
                        allFiles = removeEverythingNotTable(allFiles, params);
                        allFiles = removeUnwantedLines(allFiles, params);
                        allFiles = addNameToEveryLine(allFiles);
                        allFiles = concatMultiLiners(allFiles);
                        let lines = finalRemap(allFiles);
                        resolve(lines);
                  });
      });
};
exports.pdf2jsonPages = pdf2jsonPages;




/**
 *
 * Remap data to only necessary (strip formating etc)
 * puts all elements into array in files
 * all cells are still seperate
 *
 *
 */
const remapData = function(documents) {

      let documentsClean = {};
      // iterate through documents
      for (let i in documents) {
            let pageClean = [];
            // iterate pages
            for (let pageIndex = 0; pageIndex < documents[i].length; pageIndex++) {
                  // iterate  texts of page
                  for (let textIndex = 0; textIndex < documents[i][pageIndex].Texts.length; textIndex++) {
                        let text = {
                              text: decodeURIComponent(escape(documents[i][pageIndex].Texts[textIndex].R[0].T)) || '', // DecodeURI is necessery for example "%3A" => ":"
                              x: documents[i][pageIndex].Texts[textIndex].x || 0,
                              y: documents[i][pageIndex].Texts[textIndex].y || 0,
                              width: documents[i][pageIndex].Texts[textIndex].w || 0,
                              page: pageIndex + 1, // starts with 1
                              fileName: i
                        };
                        pageClean.push(text);
                  }
            }
            documentsClean[i] = pageClean;
      }
      return documentsClean;
};




/**
 *
 * sort all elements by page then y
 *
 *
 */
const sortByPageThenY = function(files) {
      for (let i in files) {
            files[i].sort(function(a, b) {
                  if (a.page > b.page) { return 1; }
                  else if (a.page < b.page) { return -1; }
                  else {
                        if (a.y > b.y) return 1;
                        else if (a.y < b.y) return -1;
                        else {
                              if (a.x > b.x) return 1;
                              else if (a.x < b.x) return -1;
                              else return 0;
                        }
                  }
            });
      }
      return files;
};



/**
 *
 * groups all cells into arrays of same 'page+y'
 * outputs all files with subkeys made from 'page+y' as key
 *
 *
 */
const groupContentByLines = function(documents) {
      let documentsLined = {};
      for (let i in documents) {
            documentsLined[i] = {};

            // iterate cells
            for (let r = 0; r < documents[i].length; r++) {
                  const yRoundedAndPage = (documents[i][r].page * 10000) + Math.round(documents[i][r].y * 10);
                  if (!documentsLined[i][yRoundedAndPage]) documentsLined[i][yRoundedAndPage] = [];
                  documentsLined[i][yRoundedAndPage].push(documents[i][r]);
            }
      }

      return documentsLined;
};



/**
 *
 * sort all lines by x then y
 *
 *
 */
const sortByX = function(files) {
      for (let i in files) {
            for (let y in files[i]) {
                  files[i][y].sort(function(a, b) {
                        if (a.x > b.x) { return 1; }
                        else if (a.x < b.x) { return -1; }
                        else {
                              if (a.y > b.y) return 1;
                              else if (a.y < b.y) return -1;
                              else return 0;
                        }
                  });
            }
      }
      return files;
};






const finalRemap = function(documents) {
      let lines = [];
      for (let name in documents) {
            let keysLineNumbers = Object.keys(documents[name]);
            keysLineNumbers.forEach(currentValue => {
                  lines.push({
                        Datei: documents[name][currentValue][0].fileName,
                        Seite: documents[name][currentValue][0].page,
                        'GL/NA/ZL': documents[name][currentValue][0].text,
                        Planer: documents[name][currentValue][1].text,
                        Name: documents[name][currentValue][2].text,
                        Datum: documents[name][currentValue][3].text,
                        'Kat.': documents[name][currentValue][4].text,
                        'Tätigkeistbeschrieb': (documents[name][currentValue][5] && documents[name][currentValue][5].text) || '',
                        'Std.': (documents[name][currentValue][6] && documents[name][currentValue][6].text) || ''
                  });
            });
      }
      return lines;
};



/**
 *
 *
 *
 *
 */
const concatMultiLiners = function(documents) {
      const ROW_INDEX_TATIGKEITSBESCHRIEB = 5;
      let documentsNew = {};
      for (let name in documents) {
            documentsNew[name] = {};
            let index = 0;
            for (let lineNr in documents[name]) {
                  let keysLineNumbers = Object.keys(documents[name]);
                  const cellCount = documents[name][lineNr].length;

                  // indeicates a line with only one cell
                  if (cellCount === 1) {
                        const previousLineKey = keysLineNumbers[index - 1];
                        let previousLine = documents[name][previousLineKey];
                        const value = documents[name][lineNr][0].text;
                        try {
                              previousLine[ROW_INDEX_TATIGKEITSBESCHRIEB].text += ' ' + value;
                        }
                        catch (e) {
                              console.log('Cant add extra line to previous line', value, previousLine);
                        }
                        delete documents[name][lineNr];
                  }
                  else {
                        documentsNew[name][lineNr] = documents[name][lineNr];
                        index++;
                  }
            }
      }
      return documentsNew;
};


/**
 *
 * the Name of the worker is only used in the first line, then it's empty until the next worker
 * here we add the name to every line
 *
 *
 *
 */
const addNameToEveryLine = function(documents) {
      for (let name in documents) {
            let keysLineNumbers = Object.keys(documents[name]);
            let curName = '';
            keysLineNumbers.forEach(pageY => {
                  const cellCount = documents[name][pageY].length;
                  if (cellCount === 7) curName = documents[name][pageY][2]; // name is third cell
                  if (cellCount === 6) { // => missing name! else it should have 7 cells
                        documents[name][pageY].splice(2, 0, curName);
                  }
                  else {
                        // nothing so far...
                  }
            });
      }
      return documents;
};



/**
 *
 * Remove lines that start/end with Summe, Total, headerbeginning ('GL/')
 *
 *
 *
 */
const removeUnwantedLines = function(documents, params) {
      const UNWANTED_CONTAINING = [{
                  regexp: 'Summe$',
                  index: 2
            },
            {
                  regexp: '^Total$',
                  index: 0
            },
            {
                  regexp: '^' + params.headerbeginning,
                  index: 0
            }
      ];

      let documentsNew = {};
      for (let name in documents) {
            documentsNew[name] = {};
            for (let lineNr in documents[name]) {
                  let skip = false;
                  for (let key of UNWANTED_CONTAINING) {
                        let r = new RegExp(key.regexp);
                        if (documents[name][lineNr][key.index] && r.test(documents[name][lineNr][key.index].text))
                              skip = true;
                  }
                  if (skip) continue;
                  documentsNew[name][lineNr] = documents[name][lineNr];
            }
      }
      return documentsNew;
};



/**
 *
 * Removes everything before 'GL/' and page number 'Seite 4 von 4'
 *
 *
 */
const removeEverythingNotTable = function(documents, params) {
      const TABLE_INDICATOR = new RegExp('^' + params.headerbeginning);
      let documentsNew = {};
      for (let name in documents) {
            documentsNew[name] = {};
            let hasStarted = false;
            for (let lineNr in documents[name]) {
                  if (/^Seite/.test(documents[name][lineNr][0].text)) {
                        continue;
                  }
                  if (hasStarted) {
                        documentsNew[name][lineNr] = documents[name][lineNr];
                        continue;
                  }
                  for (let cell of documents[name][lineNr]) {
                        if (TABLE_INDICATOR.test(cell.text)) {
                              hasStarted = true;
                              documentsNew[name][lineNr] = documents[name][lineNr];
                              continue;
                        }
                  }
            }
      }
      return documentsNew;
};


/**
 *
 *
 *
 *
 *
 */

const removePagesBeforeDataStarts = function(documents) {
      const FIRSTPAGE_INDICATOR = new RegExp('Detailrapport$'); // ends with "Detaillrapport", for example "Rechnungsbeilage 2, Detailrapport"
      let documentsNew = {};
      for (let name in documents) {
            documentsNew[name] = {};
            let hasStarted = false;

            // iterate lines of file
            for (let lineNr in documents[name]) { // lineNr => 'page+y'
                  if (hasStarted) {
                        documentsNew[name][lineNr] = documents[name][lineNr];
                        continue;
                  }
                  // iterate cells of this line
                  for (let cell of documents[name][lineNr]) {
                        if (FIRSTPAGE_INDICATOR.test(cell.text)) {
                              hasStarted = true;
                              continue;
                        }
                  }
            }
      }
      return documentsNew;
};












/**
 * Cleans the PDFParser output
 * detects rows and stores them in lines[] Array
 *
 * @param {object} brawJsonObject : the parsed pdf document as objet
 * @param {object} params : the document parameters (firstPage, headerbeginning)
 *
 */
var parseRapportFromJson = function(pages, params, fileName) {
      // The first page where data is in pdf
      let firstPage = parseInt(params.firstPage, 10) - 1 || 1;
      const FIRSTPAGE_INDICATOR = new RegExp(',\sDetailrapport$');
      let foundFirstPage = false;

      // array to hold rows
      let lines = [];

      // indicates that relevant content has started;
      // start is indicated by headerBeginning
      // if headerBeginning is found, then 'start' => true
      // for next line
      let start = false;

      // hold left margin of document; set by headerBeginning.left
      let leftMargin = 0;

      // wether current row is a header row or not
      let isHeaderRow = false;

      // number of columns defined by headerRow
      let colCount = 0;

      // holds x-positions of header row as keys
      // gets copied to every 'row'. in case a cell is empty there
      // is no text field. in order to detect an non-existing empty
      // cell, we need this template.
      let rowTemplate = {};

      // the tolerance of the x-Postion
      // not every cell starts at the exact same x-position of
      // the header row. there is a small deviation which we
      // we must detect so we can assign the right column number
      // to a cell which is defined in 'rowTemplate'
      let tolerance = Number.parseFloat(params.tolerance); // in %

      // go through all Pages
      for (let i = 0; i < pages.length; i++) {
            console.log('Page: ' + (parseInt(i, 10) + 1));
            console.log('Header: ' + pages[i].Texts[0].R[0].T);
            if (FIRSTPAGE_INDICATOR.test(pages[i].Texts[0].R[0].T)) {
                  // if ((pages[i].Texts[0].R[0].T).match(/.*Detailrapport$/i)) {
                  firstPage = i;
                  console.log('First page is: ', firstPage + 1);
                  foundFirstPage = true;
            }

            // Skip first n pages
            if (!foundFirstPage || i < firstPage) {
                  console.log('page skipped because it\'s not firstPage');
                  continue;
            }

            // y-Value of the last row
            let y_old = 0;
            // holds cells of a row;
            // key => X-position
            let row = {};

            // .Texts holds all text elements of a pdf page;
            // every text has a x,y position
            let cells = pages[i].Texts;

            // Go through all texts; in a pdf, text fields don't need to be
            // in order. because we're parsing machine created content
            // there is a certain amount of order though. in any case there
            // a line break is not indicated, so we must detect a new line
            // programmically
            for (let r in cells) {

                  // for better reading
                  let curCell = cells[r];

                  // DecodeURI is necessery for example "%3A" => ":"
                  // let text = decodeURIComponent(curCell.R[0].T);
                  // CSV Escaping of '"' with double quotes
                  text = text.replace(/"/g, '""');

                  // y-pos / vertical position of text
                  let x = Number.parseFloat(curCell.x);
                  let y = Number.parseFloat(curCell.y);
                  // console.log(curCell);


                  // New Line
                  // ---------------------------------------------------------------
                  // if "y" (vertical) has changed this could mean new line
                  // but first check if new line starts on very left border, because
                  // if this is not the case, then it's only a line break inside
                  // the current row
                  // the first col can therefore only have one line. all the other
                  // cols can have multiple lines; also the first col must always have
                  // a value
                  if (start && y > y_old && x <= leftMargin * (1 + tolerance)) {
                        // console.log(row);
                        // Object2Array
                        let a = [];
                        for (let s in row) {
                              a.push(row[s]);
                        }
                        //console.log('New Line:');
                        //'console.log(a);

                        // the name which is in col 3 is only printed once
                        // if there is no name, take name from previous line
                        if (a[2] === '' && lines.length > 0 && lines[lines.length - 1].length >= 2) {
                              a[2] = lines[lines.length - 1][4];
                        }

                        // Next we count how many cells in a row have content
                        // rows with more than contentThresol=30% empty cells are later skipped
                        let cellsWithContent = 0;
                        for (let s = 0; s < a.length; s++) {
                              if (a[s] !== '') cellsWithContent++;
                        }
                        let colCount = Object.keys(rowTemplate).length;
                        const largeEnoughRow = cellsWithContent >= colCount * (1 - contentThresold);
                        if (!largeEnoughRow) {
                              console.log('This row has not enough content to be a valid row!');
                              console.log(a);
                              console.log('Total Cols: ' + colCount + '; CellsWithContent = ' + cellsWithContent + '; threaSold = ' + (colCount * (1 - contentThresold)));
                        }
                        // here we check one last time if it is a valid content row, then we push the row to lines array
                        // Checks are: not headerRow, no more content than actual cols but still large enough
                        if (!isHeaderRow && cellsWithContent <= colCount && largeEnoughRow) {
                              a.unshift(parseInt(i, 10) + 1); // add Pagenumber as column
                              a.unshift(fileName); // Add Filename as column
                              //console.log(a);
                              lines.push(a);
                        }
                        if (isHeaderRow && cellsWithContent <= colCount && largeEnoughRow) {
                              a.unshift('Seite'); // add Pagenumber as column
                              a.unshift('Datei'); // Add Filename as column
                              lines.push(a);
                        }
                        if (isHeaderRow) {
                              console.log(rowTemplate);
                              isHeaderRow = false;
                        }
                        // reset template to original header-template
                        row = {};
                        for (let s in rowTemplate) {
                              row[s] = '';
                        }
                  }


                  // just new col, not new line
                  if (start) {
                        let keyFound = false;
                        if (!isHeaderRow) {
                              // go through the template defined row-object and find
                              // closest key (x-pos) for this cell; s = x-positions
                              for (let s in row) {
                                    if (x >= s * (1 - tolerance) && x <= s * (1 + tolerance)) {
                                          x = s; // set x position to header x-position
                                          keyFound = true;
                                          break;
                                    }
                              }
                        }
                        if (keyFound && (row[x] === undefined || row[x] === '')) {
                              row[x] = text.trim();
                        }
                        // if there is already content in this cell (multiple line cell) append
                        else if (keyFound) {
                              row[x] += ' ' + text.trim();
                        }
                        else if (isHeaderRow) {
                              row[x] = text.trim();
                              rowTemplate[x] = '';
                        }
                  }

                  // Beginning of header row detected => start new table
                  const headerMarker = new RegExp('^' + params.headerbeginning);
                  if (headerMarker.test(text)) {
                        // reset row template
                        rowTemplate = {};
                        // reset number of columns
                        colCount = 0;
                        // start to parse table from here on
                        start = true;
                        // set left margin of the table
                        leftMargin = curCell.x;
                        row[curCell.x] = text.trim();
                        // we're reading from header row until there's a new line
                        isHeaderRow = true;
                        // set first field of rowTemplate to x-Position
                        rowTemplate[curCell.x] = '';
                  }

                  // we're counting the total number of columns of the table
                  if (isHeaderRow) colCount++;

                  // assign y-pos to y-old position
                  y_old = y;
            }
      }
      return lines;
};




/**
 * Compare a list of PDF with PDF-Pairs
 *
 * @param files : array of File-Object from upload
 * @param fields: form parameters from POST
 * @param rule: The rule by which the PDF-Files differentiate (exp. V_)
 * @param cb: return callback
 */
const compareAllPdfs = function(files, fields, rule, cb) {
      // first run through all non rule files in a object with filename as key
      let fileGroups = {};
      for (let i = 0; i < files.length; i++) {
            if (files[i].name.indexOf(rule) == -1) {
                  fileGroups[files[i].name] = [files[i]];
            }
      }
      // second run add rule files to non rule key-objects
      for (let i = 0; i < files.length; i++) {
            if (files[i].name.indexOf(rule) > -1) { // files where rule applies
                  // go through object and find the one that has a key with the non-rule string
                  for (let s in fileGroups) {
                        if (s === files[i].name.replace(rule, '')) {
                              fileGroups[s].push(files[i]);
                              break;
                        }
                  }
            }
      }
      // console.log(fileGroups);
      let aFuncts = [];
      for (let i in fileGroups) {
            aFuncts.push(function(i) {
                  return function(callback) {
                        compare2pdf(fileGroups[i], fields, rule, function(err, diff) {
                              callback(err, diff);
                        });
                  };
            }(i));
      }
      async.parallel(aFuncts, function(err, data) {
            console.log(data);
            let output = [];
            for (let i = 0; i < data.length; i++) {
                  if (data[i].diff) {
                        output.push(data[i]);
                  }
            }
            cb(err, output);
      });
};
exports.compareAllPdfs = compareAllPdfs;


/**
 * Compares two PDF files
 *
 * @param files : array of File-Object from upload
 * @param fields: form parameters from POST
 * @param rule: The rule by which the PDF-Files differentiate (exp. V_)
 * @param cb: return callback
 *
 * returns false if no differences
 * returns object with differences
 */
let compare2pdf = function(files, fields, rule, cb) {
      if (files.length !== 2) return cb(null, false);
      console.log('comparing files ' + files[0].name + ' with file ' + files[1].name);
      pdfConcate(files, fields, function(err, data) {
            let setA = [];
            let setB = [];
            if (err === null) {
                  for (let i = 0; i < data.length; i++) {
                        if (data[i][0].indexOf(rule) > -1) {
                              data[i].shift(); // remove first
                              data[i].shift(); // two cols (filename, page)
                              setA.push(data[i]);
                        }
                        else {
                              data[i].shift(); // remove first
                              data[i].shift(); // two cols (filename, page)
                              setB.push(data[i]);
                        }
                  }
                  // Do the DIFF
                  let Diff = require('deep-object-diff').detailedDiff;
                  let diff = Diff(setA, setB);
                  console.log(diff);
                  // No differences
                  if (Object.keys(diff).length === 0) {
                        diff = false;
                  }
                  cb(null, { name: files[0].name, diff: diff });
            }
      });
};
exports.compare2pdf = compare2pdf;





/**
 * Sorts Rapport rows
 *
 * sort by Name, then by Project
 *
 */
const sortRapport = function(rows) {
      rows = utils.sort2D(rows, ['3', '4']);
      return rows;
};
