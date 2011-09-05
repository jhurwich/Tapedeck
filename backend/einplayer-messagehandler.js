Einplayer.Backend.MessageHandler = {

  ports: {},
  init: function() {
    var self = this;
    chrome.extension.onConnect.addListener(function(port) {
     
      // port.name is a tabId
      self.ports[port.tab.id] = port;

      port.onMessage.addListener(self.handleRequest.curry(port));
      port.onMessage.addListener(self.handleResponse);
    });
  },
  
  pendingCallbacks: {},
  handleResponse: function(response) {
    if (response.type != "response") {
      return;
    }
    
    var callbacks = Einplayer.Backend.MessageHandler.pendingCallbacks;
    if (response.callbackID in callbacks) {
      callbacks[response.callbackID](response);
    }
  },

  handleRequest: function(port, request) {
    if (request.type != "request") {
      return;
    }
    
    var response = Einplayer.Backend.MessageHandler.newResponse(request);
    
    switch(request.action)
    {
      case "getView":
        var scriptName = request.viewName;
        var packageName = (request.packageName ? request.packageName : null);
        
        
        var rendered = Einplayer.Backend.TemplateManager.renderView
                                (scriptName, request.options, packageName);

        var viewString = $('<div>').append($(rendered))
                                   .remove()
                                   .html();
        response.view = viewString;
        port.postMessage(response);
        break;
      default:
        throw new Error("handleRequest was sent an unknown action");
    }
  },
  
  getSelectedTab: function(callback) {
    chrome.windows.getLastFocused(function(focusWin) {
      chrome.tabs.getSelected(focusWin.id, function(selectedTab) {
        callback(selectedTab);
      });
    });
  },

  getDocument: function(callback, tab) {
    if (typeof(tab) == "undefined") {
      Einplayer.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Einplayer.Backend.MessageHandler.getDocument(callback, selectedTab);
      });
      return;
    }

    var scrapeResponseHandler = function(response, sender, sendResponse) {
      if (sender.tab.id != tab.id) {
        console.log("response mismatch for page-scrape");
        return;
      }

      callback(response.document);
      chrome.extension.onRequest.removeListener(scrapeResponseHandler);
    };
    chrome.extension.onRequest.addListener(scrapeResponseHandler);

    Einplayer.Backend.MessageHandler
                     .executeScript(tab,
                                    {allFrames: false,
                                     file: "frontend/scripts/scraper.js"});

  },

  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";

    if (typeof(callback) != "undefined") {
      var cbID = new Date().getTime();
      Einplayer.Backend.MessageHandler.pendingCallbacks[cbID] = callback;
      request.callbackID = cbID;
    }
    return request;
  },

  newResponse: function(request, object) {
    var response = (object ? object : { });
    response.type = "response";
    
    if ("callbackID" in request) {
      response.callbackID = request.callbackID;
    }
    return response;
  },

  executeScript: function(tab, options) {
    if (!Einplayer.Backend.MessageHandler.isTest(tab.url)) {
      chrome.tabs.executeScript(tab.id, options);
    }
    else {
      var request = Einplayer.Backend.MessageHandler.newRequest({
        action: "executeScriptInTest",
        script: options.file,
      });
      var port = Einplayer.Backend.MessageHandler.ports[tab.id];
      port.postMessage(request);
    }
  },

  isTest: function(url) {
    var match = url.match(/chrome-extension.*SpecRunner.html$/);
    return (match != null);
  },

};
