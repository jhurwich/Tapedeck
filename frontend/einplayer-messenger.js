if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}

Einplayer.Frontend.Messenger = {

  port: null,
  init: function(callback) {
    var self = this;
    var initComplete = false;
    chrome.tabs.getCurrent(function(tab) {
      self.port = chrome.extension.connect({ name: tab.id.toString() });
      self.port.onMessage.addListener(self.handleResponse);
      callback();
    });
  },

  pendingCallbacks: {},
  handleResponse: function(response) {
    var callbacks = Einplayer.Frontend.Messenger.pendingCallbacks;
    if (response.callbackID in callbacks) {
      callbacks[response.callbackID](response);
    }
  },
  
  getView: function(viewName, options, packageName, callback) {

    var cbID = new Date().getTime();
    this.pendingCallbacks[cbID] = callback;
    
    var message = {
      action     : "getView",
      viewName   : viewName,
      options    : options,
      callbackID : cbID,
    };
    
    if (packageName && packageName.length > 0) {
      message.packageName = packageName;
    }
    
    this.port.postMessage(message);
  },
};
 
