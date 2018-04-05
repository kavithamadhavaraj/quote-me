/**
 * Convert Excel file to Sheets
 * @param {Blob} excelFile The Excel file blob data; Required
 * @param {String} filename File name on uploading drive; Required
 * @param {Array} arrParents Array of folder ids to put converted file in; Optional, will default to Drive root folder
 * @return {Spreadsheet} Converted Google Spreadsheet instance
 **/
function convertExcel2Sheets(excelFile, filename, arrParents) {
  
  var parents  = arrParents || []; // check if optional arrParents argument was provided, default to empty array if not
  if ( !parents.isArray ) parents = []; // make sure parents is an array, reset to empty array if not
  
  // Parameters for Drive API Simple Upload request (see https://developers.google.com/drive/web/manage-uploads#simple)
  var uploadParams = {
    method:'post',
    contentType: 'application/vnd.ms-excel', // works for both .xls and .xlsx files
    contentLength: excelFile.getBytes().length,
    headers: {'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()},
    payload: excelFile.getBytes()
  };
  
  // Upload file to Drive root folder and convert to Sheets
  var uploadResponse = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v2/files/?uploadType=media&convert=true', uploadParams);
    
  // Parse upload&convert response data (need this to be able to get id of converted sheet)
  var fileDataResponse = JSON.parse(uploadResponse.getContentText());

  // Create payload (body) data for updating converted file's name and parent folder(s)
  var payloadData = {
    title: filename, 
    parents: []
  };
  if ( parents.length ) { // Add provided parent folder(s) id(s) to payloadData, if any
    for ( var i=0; i<parents.length; i++ ) {
      try {
        var folder = DriveApp.getFolderById(parents[i]); // check that this folder id exists in drive and user can write to it
        payloadData.parents.push({id: parents[i]});
      }
      catch(e){} // fail silently if no such folder id exists in Drive
    }
  }
  // Parameters for Drive API File Update request (see https://developers.google.com/drive/v2/reference/files/update)
  var updateParams = {
    method:'put',
    headers: {'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()},
    contentType: 'application/json',
    payload: JSON.stringify(payloadData)
  };
  
  // Update metadata (filename and parent folder(s)) of converted sheet
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+fileDataResponse.id, updateParams);  
  return SpreadsheetApp.openById(fileDataResponse.id).addEditors(target);
}

/**
 * Sample use of convertExcel2Sheets() for testing
 **/
 function testConvertExcel2Sheets(xlsBlob, xlsFilename) {
  var destFolders = []; // array of IDs of Drive folders to put converted file in; empty array = root folder
  var ss = convertExcel2Sheets(xlsBlob, xlsFilename, destFolders);
  return ss.getId();
}