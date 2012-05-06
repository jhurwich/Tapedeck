if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
  Tapedeck.Frontend = { };
}
if (typeof(Tapedeck.Frontend.Messenger) != "undefined") {
  return;
}

Tapedeck.Frontend.Messenger = {

  DEBUG_LEVELS: {
    NONE  : 0,
    BASIC : 1,
    ALL   : 2,
  },
  debug: 0,

  port: null,
  init: function(callback) {
    var self = this;
    var initComplete = false;

    self.port = chrome.extension.connect();
    self.port.onMessage.addListener(self.handleRequest);
    self.port.onMessage.addListener(self.handleResponse);
    self.log("Connected port for tab " + self.port.name);
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
    var self = Tapedeck.Frontend.Messenger;

    var response = self.newResponse(request);
    self.log("Receving request: " + request.action);

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

        self.log("Executing script in test: " + scriptName);
        if (typeof(request.params) != "undefined") {
          window.parent.TapedeckInjected[scriptName].start(request.params);
        }
        else {
          window.parent.TapedeckInjected[scriptName].start();
        }
        break;

      case "pushView":
        Tapedeck.Frontend.Frame.replaceView(request.targetID,
                                            request.view,
                                            request.proxyEvents);
        break;

      case "showModal":
        var wrappedCallback = function(params) {
          response.params = params;
          self.sendMessage(response);
        };
        var cleanupCallback = function() {
          response.error = true;
          self.sendMessage(response);
        };

        Tapedeck.Frontend.Frame.Modal.show(request.params,
                                           wrappedCallback,
                                           cleanupCallback);
        break;

      case "loadComplete":
        Tapedeck.Frontend.Frame.onLoadComplete();
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

    Tapedeck.Frontend.Messenger.sendMessage(request);
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

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  seekPercent: function(percent) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "seek",
      percent : percent
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  setVolume: function(percent) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "setVolume",
      percent : percent
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  download: function(trackID, callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "download",
      trackID : trackID
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  finishDownload: function(trackID) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "finishDownload",
      trackID : trackID
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
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

    Tapedeck.Frontend.Messenger.sendMessage(request);
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

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  removeQueuedAt: function(pos) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action : "removeQueuedAt",
      pos    : pos
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  playPlaylist: function(index) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action : "playPlaylist",
      index  : index,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  removePlaylist: function(index) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action : "removePlaylist",
      index  : index,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  getRepeat: function(callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "getRepeat",
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  toggleRepeat: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "toggleRepeat",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  shuffleQueue: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "shuffleQueue",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  saveQueue: function(playlistName) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "saveQueue",
      playlistName : playlistName,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  clearQueue: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action   : "clearQueue"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  playIndex: function(index) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "playIndex",
      index : index
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  queueAndPlayNow: function(trackID) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "queueAndPlayNow",
      trackID : trackID
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  setCassette: function(cassetteID) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "setCassette",
      cassetteID : cassetteID
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  removeCassette: function(cassetteID) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "removeCassette",
      cassetteID : cassetteID
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  browsePrevPage: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "browsePrevPage"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  setPage: function(page) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "setPage",
      page    : page
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  browseNextPage: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "browseNextPage"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  ejectCassette: function() {
    this.setCassette("");
  },

  cassettify: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "cassettify"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  loadLink: function(url) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "loadLink",
      url : url
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  sendMessage: function(message) {
    var self = Tapedeck.Frontend.Messenger;
    if (message.type == "request") {
      self.log("Posting request: " + message.action, self.DEBUG_LEVELS.ALL);
    }
    else if (message.type == "response") {
      self.log("Posting response - callback: " + message.callbackID,
               self.DEBUG_LEVELS.ALL);
    }

    self.port.postMessage(message);
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

  log: function(str, level) {
    if (this.debug == this.DEBUG_LEVELS.NONE) {
      return;
    }
    if (typeof(level) == "undefined") {
      level = this.DEBUG_LEVELS.BASIC;
    }
    if (this.debug >= level) {

      var currentTime = new Date();
      console.log("Msgr (" + currentTime.getTime() + ") - " + str);
    }
  },

  clear: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "clear",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
};

