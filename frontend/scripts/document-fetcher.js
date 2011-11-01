TapedeckInjected.DocumentFetcher = {

  start: function() {
    var response = { };
    response.document = $("body").html();
    chrome.extension.sendRequest(response);
  },

};

if (!TapedeckInjected.isTest()) {
  TapedeckInjected.DocumentFetcher.start();
}
