let tempArray = new Array();



//main function
const do2DArraySort = function (arrayToBeSorted, sortColumnArray) {
      if (arrayToBeSorted == "undefined" || arrayToBeSorted == "null") return arrayToBeSorted;
      if (arrayToBeSorted.length == 0) return arrayToBeSorted;
      if (sortColumnArray.length == 0) return arrayToBeSorted;
      tempArray = arrayToBeSorted;
      var totalLength = sortColumnArray.length;
      for (var m = 0; m < totalLength; m++) {
            if (m == 0) {
                  doBubbleSort(tempArray, tempArray.length, sortColumnArray[m]);
            }
            else {
                  doMultipleSort(tempArray, sortColumnArray[m], sortColumnArray[m - 1]);
            }
      }
      return tempArray;
};
exports.sort2D = do2DArraySort;



//basic bubble sort implementation
const doBubbleSort = function (arrayName, length, element) {
      for (var i = 0; i < (length - 1); i++) {
            for (var j = i + 1; j < length; j++) {
                  if (arrayName[j][element] < arrayName[i][element]) {
                        var dummy = arrayName[i];
                        arrayName[i] = arrayName[j];
                        arrayName[j] = dummy;
                  }
            }
      }
};

//appends an array content to the original array
const addToArray = function (originalArray, addArray) {
      if (addArray.length != 0) {
            var curLength = 0;
            curLength = originalArray.length;
            var maxLength = 0;
            maxLength = curLength + addArray.length;
            var itrerateArray = 0;
            for (var r = curLength; r < maxLength; r++) {
                  originalArray[r] = addArray[itrerateArray];
                  itrerateArray++;
            }
      }
};

//check if a value exists in a single dimensional array
const checkIfExists = function (arrayToSearch, valueToSearch) {
      if (arrayToSearch == "undefined" || arrayToSearch == "null") return false;
      if (arrayToSearch.length == 0) return false;
      for (var k = 0; k < arrayToSearch.length; k++) {
            if (arrayToSearch[k] == valueToSearch)
                  return true;
      }
      return false;
};

//sorts an 2D array based on the distinct values of the previous column
const doMultipleSort = function (sortedArray, currentCol, prevCol) {
      var resultArray = new Array();
      var newdistinctValuesArray = new Array();
      //finding distinct previous column values 
      for (var n = 0; n < sortedArray.length; n++) {
            if (checkIfExists(newdistinctValuesArray, sortedArray[n][prevCol]) == false)
                  newdistinctValuesArray.push(sortedArray[n][prevCol]);
      }
      var recCursor = 0;
      var newTempArray = new Array();
      var toStoreArray = 0;
      //for each of the distinct values
      for (var pp = 0; pp < newdistinctValuesArray.length; pp++) {
            toStoreArray = 0;
            newTempArray = new Array();
            //find the rows with the same previous column value
            for (var qq = recCursor; qq < sortedArray.length; qq++) {
                  if (sortedArray[qq][prevCol] != newdistinctValuesArray[pp]) break;
                  newTempArray[toStoreArray] = sortedArray[qq];
                  toStoreArray++;
                  recCursor++;
            }
            //sort the row based on the current column   
            doBubbleSort(newTempArray, newTempArray.length, currentCol);
            //append it to the result array
            addToArray(resultArray, newTempArray);
      }
      tempArray = resultArray;
};