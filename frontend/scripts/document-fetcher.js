EinInjected.DocumentFetcher = {

  start: function() {
    var response = { };
    response.document = $("body").html();
    chrome.extension.sendRequest(response);
  },

};

if (!EinInjected.isTest()) {
  EinInjected.DocumentFetcher.start();
}
