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

      case "updateSeekSlider":
        Einplayer.Frontend.Frame.Player.SeekSlider.updateSlider
                                                  (request.currentTime,
                                                   request.duration);
        break;
      case "updateVolumeSlider":
        Einplayer.Frontend.Frame.Player.VolumeSlider.updateSlider
                                                    (request.volume);
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

  setVolume: function(percent) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action  : "setVolume",
      percent : percent
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  download: function(trackID, callback) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action  : "download",
      trackID : trackID
    }, callback);

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },
  finishDownload: function(trackID) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action  : "finishDownload",
      trackID : trackID
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  queueTrack: function(trackX, index) {
    // trackX because could be Obj or ID
    Einplayer.Frontend.Messenger.queueTracks([trackX], index);
  },

  queueTracks: function(trackXs, index) {
    // trackX because could be Obj or ID

    var request = Einplayer.Frontend.Messenger.newTrackBasedRequest({
      action : "queueTracks",
      trackXs : trackXs
    });

    if (typeof(index) != "undefined") {
      request.index = index;
    };
    
    Einplayer.Frontend.Messenger.port.postMessage(request);
  },
  
  moveTracks: function(trackObjs, index) {
    // can only move trackObjs because need each track's current index
    
    var request = Einplayer.Frontend.Messenger.newTrackBasedRequest({
      action : "moveTracks",
      trackXs : trackObjs
    });

    if (typeof(index) != "undefined") {
      request.index = index;
    };
    
    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  removeQueuedAt: function(pos) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action : "removeQueuedAt",
      pos    : pos
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  playPlaylist: function(index) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action : "playPlaylist",
      index  : index,
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  removePlaylist: function(index) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action : "removePlaylist",
      index  : index,
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  getRepeat: function(callback) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action       : "getRepeat",
    }, callback);

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  toggleRepeat: function() {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action       : "toggleRepeat",
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  shuffleQueue: function() {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action       : "shuffleQueue",
    });

    Einplayer.Frontend.Messenger.port.postMessage(request);
  },

  saveQueue: function(playlistName) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action       : "saveQueue",
      playlistName : playlistName,
    });

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

  queueAndPlayNow: function(trackID) {
    var request = Einplayer.Frontend.Messenger.newRequest({
      action  : "queueAndPlayNow",
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

  newTrackBasedRequest: function(object, callback) {
    var trackXs = object.trackXs;
    object.trackXs = null;
    var request = Einplayer.Frontend.Messenger.newRequest(object,
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
 
