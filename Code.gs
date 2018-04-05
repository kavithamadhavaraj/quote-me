/*********************************************************
Author: Kavitha Madhavaraj

* Read labeled messages
* Provide choice which mail to read
* Read xls attachments
* Once submitted, mail to designated email ID and remove label.

**********************************************************/
//keywords to identify possible senders
var possibleSenders = ["kavitha","giridhar","humera","kesavan"]

//recepient email address to forward the responded quotation 
var target = ["kavitha********@gmail.com"]

//check if the sender name matches the keyword
function patternMatch(fromAddress){
  for(var i=0; i<possibleSenders.length; i++){
    if (fromAddress.toLowerCase().indexOf(possibleSenders[i]) != -1){
      return true;
    }
  }
  return false;
}

//get current script's execution URL
function getScriptURL(qs) {
  var url = ScriptApp.getService().getUrl();
  return url + qs ;
}

//main method for the app
function doGet(e) {
  //if there is some query string, forward it to quote-page.html, otherwise navigate to home page (quote-me.html)
  if(e.queryString !== '')
    return HtmlService.createHtmlOutputFromFile("quote-page.html").setTitle("Quote Page"); 
  else
    return HtmlService.createHtmlOutputFromFile("quote-me.html").setTitle("Quote Me"); 
}

function retrieveMails(){
  // read all the mails that are with "Quotation" as label
  const mailThreads = GmailApp.getUserLabelByName("Quotation").getThreads();
  var mailObj = []
  var today = new Date();
  var last_month = today.setMonth(today.getMonth()-1);
  for (var i=0; i<mailThreads.length; i++){
    var mails = mailThreads[i].getMessages();
    var responseObj = {}
    responseObj.subject = mailThreads[i].getFirstMessageSubject();    
    responseObj.messages = []
    // if the mails retrieved are more than a month old, then stop retrieving
    if(mailThreads[i].getLastMessageDate() <= last_month)
      break;
    for(var j=0; j<mails.length; j++){
      if (patternMatch(mails[j].getFrom())){
        var messageObj = {}
        messageObj.id = mails[j].getId();
        messageObj.sender = mails[j].getFrom();
        messageObj.date = mails[j].getDate().toString();
        responseObj.messages.push(messageObj);
      } 
    }
    mailObj.push(responseObj);
  }
  return mailObj;
}

function retrieveAttachments(id){
  const message = GmailApp.getMessageById(id);
  const attachments = message.getAttachments();
  var response = [];
  Logger.log(attachments.length);
  // create a file object in drive for each of the attachments if it did not exist
  for (var i=0; i<attachments.length; i++){
    // only process spreadsheet attachments
    if((attachments[i].getContentType() == "application/msexcel") || (attachments[i].getContentType() == "application/vnd.ms-excel")){
       var sheetID = null;
       var attachment = {};
       if(DriveApp.getFilesByName(id+"_"+attachments[i].getName()).hasNext())
        sheetID = DriveApp.getFilesByName(id+"_"+attachments[i].getName()).next().getId();
       else
        sheetID = testConvertExcel2Sheets(attachments[i].copyBlob(), id+"_"+attachments[i].getName());
       attachment.filename = attachments[i].getName();
       attachment.id = sheetID;
       response.push(attachment);
    }
  }
  return response;
}

function retrieveQuote(id){
  //store the quote id in cache, to be able to read it later. 
  //may not be necessary if you pass around the document id in method calls
  CacheService.getUserCache().remove("quote_doc");
  CacheService.getUserCache().put("quote_doc", id+"", 3600);
}

function saveQuote(responseArray, offset){
  if (responseArray != null)
     try{
         var sheetID = CacheService.getUserCache().get("quote_doc");
         var sheet = SpreadsheetApp.openById(sheetID).getActiveSheet();
         for (var i=0; i<responseArray.length; i++){
           var value = responseArray[i][responseArray[i].length-1];
           if (value != "")
             sheet.getRange(offset+1, responseArray[i].length).setValue("Rs."+ responseArray[i][responseArray[i].length-1]+"/-KG")
           offset += 1;
         }
       }
      catch(e){
         Logger.log(e);
      }
}

function sendMail(){
   try{
     var sheetID = CacheService.getUserCache().get("quote_doc");
     var url = SpreadsheetApp.openById(sheetID).getUrl();
     var body = "Hi. You have been sent a quote. Review here : " + url;
     for(var i=0; i<target.length; i++){
       MailApp.sendEmail(target[i],"Quotation Received", body);
     }
     return "SUCCESS";
   }
   catch(e){
    return "FAILURE";
   }
}

function show5rows(offset){
  var response = {
    end_index : null,
    next : false,
    data : null
  };
  var sheetID = CacheService.getUserCache().get("quote_doc");
  var sheet = SpreadsheetApp.openById(sheetID).getActiveSheet();
  var thisQuote = sheet.getDataRange().getValues();
  if ((offset+5) < thisQuote.length) response.next = true;
  response.data = thisQuote.slice(offset, offset+5);
  response.end_index = offset+4;
  return response;
}
