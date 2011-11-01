if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
  Tapedeck.Frontend = { };
}
if (typeof(Tapedeck.Frontend.Messenger) != "undefined") {
  return;
}

Tapedeck.Frontend.Messenger = {

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
    
    var callbacks = Tapedeck.Frontend.Messenger.pendingCallbacks;
    if (response.callbackID in callbacks) {
      callbacks[response.callbackID](response);
    }
  },

  handleRequest: function(request) {
    if (request.type != "request") {
      return;
    }
    
    var response = Tapedeck.Frontend.Messenger.newResponse(request);
    
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

        window.parent.TapedeckInjected[scriptName].start();
        break;
        
      case "pushView":
        Tapedeck.Frontend.Frame.replaceView(request.targetID,
                                            request.view);
        break;

      case "updateSeekSlider":
        Tapedeck.Frontend.Frame.Player.SeekSlider.updateSlider
                                                 (request.currentTime,
                                                  request.duration);
        break;
      case "updateVolumeSlider":
        Tapedeck.Frontend.Frame.Player.VolumeSlider.updateSlider
                                                   (request.volume);
        break;
      
      default:
        throw new Error("Messenger's handleRequest was sent an unknown action '" + request.action + "'");
    }
  },

  requestUpdate: function(updateType) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action     : "requestUpdate",
      updateType : updateType
    });
    
    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },
  
  getView: function(viewName, options, packageName, callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action     : "getView",
      viewName   : viewName,
      options    : options,
    }, callback);
    
    if (packageName && packageName.length > 0) {
      request.packageName = packageName;
    }

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  seekPercent: function(percent) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "seek",
      percent : percent
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  setVolume: function(percent) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "setVolume",
      percent : percent
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  download: function(trackID, callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "download",
      trackID : trackID
    }, callback);

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },
  finishDownload: function(trackID) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "finishDownload",
      trackID : trackID
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  queueTrack: function(trackX, index) {
    // trackX because could be Obj or ID
    Tapedeck.Frontend.Messenger.queueTracks([trackX], index);
  },

  queueTracks: function(trackXs, index) {
    // trackX because could be Obj or ID

    var request = Tapedeck.Frontend.Messenger.newTrackBasedRequest({
      action : "queueTracks",
      trackXs : trackXs
    });

    if (typeof(index) != "undefined") {
      request.index = index;
    };
    
    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },
  
  moveTracks: function(trackObjs, index) {
    // can only move trackObjs because need each track's current index
    
    var request = Tapedeck.Frontend.Messenger.newTrackBasedRequest({
      action : "moveTracks",
      trackXs : trackObjs
    });

    if (typeof(index) != "undefined") {
      request.index = index;
    };
    
    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  removeQueuedAt: function(pos) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action : "removeQueuedAt",
      pos    : pos
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  playPlaylist: function(index) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action : "playPlaylist",
      index  : index,
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  removePlaylist: function(index) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action : "removePlaylist",
      index  : index,
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  getRepeat: function(callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "getRepeat",
    }, callback);

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  toggleRepeat: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "toggleRepeat",
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  shuffleQueue: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "shuffleQueue",
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  saveQueue: function(playlistName) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "saveQueue",
      playlistName : playlistName,
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },
  
  clearQueue: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action   : "clearQueue"
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  playIndex: function(index) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "playIndex",
      index : index
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  queueAndPlayNow: function(trackID) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "queueAndPlayNow",
      trackID : trackID
    });

    Tapedeck.Frontend.Messenger.port.postMessage(request);
  },

  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";

    if (typeof(callback) != "undefined") {
      var cbID = new Date().getTime();
      Tapedeck.Frontend.Messenger.pendingCallbacks[cbID] = callback;
      request.callbackID = cbID;
    }
    return request;
  },

  newTrackBasedRequest: function(object, callback) {
    var trackXs = object.trackXs;
    object.trackXs = null;
    var request = Tapedeck.Frontend.Messenger.newRequest(object,
                                                         callback);

    if (typeof(trackXs[0]) == "string") {
      // we got the tracks as trackIDs
      request.trackIDs = trackXs;
    }
    else {
      // we got the tracks as crude objects
      request.trackObjs = trackXs;
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
 
