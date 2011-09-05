
if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}
if (typeof(Einplayer.Frontend.Messenger) != "undefined") {
  return;
}

Einplayer.Frontend.Messenger = {

  port: null,
  init: function(callback) {
    var self = this;
    var initComplete = false;

    self.port = chrome.extension.connect();
    self.port.onMessage.addListener(self.handleRequest);
    self.port.onMessage.addListener(self.handleResponse);    
  },

  pendingCallbacks: {},
  handleResponse: function(response) {
    if (response.type != "response") {
      return;
    }
    
    var callbacks = Einplayer.Frontend.Messenger.pendingCallbacks;
    if (response.callbackID in callbacks) {
      callbacks[response.callbackID](response);
    }
  },

  handleRequest: function(request) {
    if (request.type != "request") {
      return;
    }
    
    var response = Einplayer.Frontend.Messenger.newResponse(request);
    
    switch(request.action)
    {
      case "executeScriptInTest":
              
        var script = request.script;
        var scriptName = script.replace("frontend/scripts/", "");
        scriptName = scriptName.replace(".js", "");
        scriptName = scriptName.charAt(0).toUpperCase() + scriptName.slice(1);

        window.parent.EinInjected[scriptName].start();
        break;
      default:
        throw new Error("handleRequest was sent an unknown action");
    }
  },
  
  getView: function(viewName, options, packageName, callback) {

    var request = Einplayer.Frontend.Messenger.newRequest({
      action     : "getView",
      viewName   : viewName,
      options    : options,
    }, callback);
    
    if (packageName && packageName.length > 0) {
      request.packageName = packageName;
    }

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";

    if (typeof(callback) != "undefined") {
      var cbID = new Date().getTime();
      Einplayer.Frontend.Messenger.pendingCallbacks[cbID] = callback;
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
};
 
