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
        var scriptFile = script.replace("frontend/scripts/", "");
        scriptFile = scriptFile.replace(".js", "");

        var words = scriptFile.split("-");
        var scriptName = "";
        for (var i = 0; i < words.length; i++) {
          scriptName += words[i].charAt(0).toUpperCase() +
                        words[i].slice(1);
        }

        window.parent.EinInjected[scriptName].start();
        break;
        
      case "pushView":
        Einplayer.Frontend.Frame.replaceView(request.targetID,
                                             request.view);
        break;

      case "updateSlider":
        Einplayer.Frontend.Frame.Player.updateSlider(request.currentTime,
                                                     request.duration);
        break;
      
      default:
        throw new Error("Messenger's handleRequest was sent an unknown action '" + request.action + "'");
    }
  },

  requestUpdate: function(updateType) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action     : "requestUpdate",
      updateType : updateType
    });
    
    Einplayer.Frontend.Messenger.port.postMessage(request);
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

  seekPercent: function(percent) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action  : "seek",
      percent : percent
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  queueTrack: function(trackID, index) {
    Einplayer.Frontend.Messenger.queueTracks([trackID], index);
  },

  queueTracks: function(trackIDs, index) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action   : "queueTracks",
      trackIDs : trackIDs
    });
    if (typeof(index) != "undefined") {
      request.index = index;
    };
    
    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  clearQueue: function() {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action   : "clearQueue"
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  playIndex: function(index) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action  : "playIndex",
      index : index
    });

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
 
