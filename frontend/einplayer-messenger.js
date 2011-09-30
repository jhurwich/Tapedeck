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
        
      case "updateView":
        Einplayer.Frontend.Frame.replaceView(request.targetID,
                                             request.view);
        break;

      case "updatePlayer":
        Einplayer.Frontend.Frame.Player.update(request.state, request.track);
        break;
      
      default:
        throw new Error("Messenger's handleRequest was sent an unknown action");
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

  seekCurrentTrack: function(time) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action : "seek",
      time   : time
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  queueTrack: function(trackID) {
    Einplayer.Frontend.Messenger.queueTracks([trackID]);
  },

  queueTracks: function(trackIDs) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action   : "queueTracks",
      trackIDs : trackIDs
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  playTrack: function(trackID) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action  : "playTrack",
      trackID : trackID
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
 
