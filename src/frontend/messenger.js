if (typeof(Tapedeck) == "undefined") {
  var Tapedeck = { };
}
if (typeof(Tapedeck.Frontend) == "undefined") {
  Tapedeck.Frontend = { };
}
if (typeof(Tapedeck.Frontend.Messenger) != "undefined") {
  return;
}

Tapedeck.Frontend.Messenger = {

  port: null,
  init: function() {
    var self = this;

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

    if (response.callbackID in Tapedeck.Frontend.Messenger.pendingCallbacks) {
      Tapedeck.Frontend.Messenger.pendingCallbacks[response.callbackID](response);

      if (typeof(response.dontClear) == "undefined" || !response.dontClear) {
        delete Tapedeck.Frontend.Messenger.pendingCallbacks[response.callbackID];
      }
    }
    else {
      console.error("Could not find callback '" + response.callbackID + "' for response.");
    }
  },

  handleRequest: function(request) {
    if (request.type != "request") {
      return;
    }
    var self = Tapedeck.Frontend.Messenger;

    var response = self.newResponse(request);
    self.log("Receiving request: " + request.action);

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
        Tapedeck.Frontend.Frame.replaceView(request.view,
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

        Tapedeck.Frontend.Frame.Modal.show(request.view,
                                           request.proxyEvents,
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

      case "forceCheckSync":
        Tapedeck.Frontend.Frame.checkSync();
        break;

      case "setLogs":
        Tapedeck.Frontend.Utils.setLogs(request.logs);
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

  getLogs: function(callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action        : "getLogs",
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  // options should be null if view should self-populate, an empty object will force
  // no options to the view
  getView: function(viewName, options, packageName, callback, postPopulate) {
    if(typeof(postPopulate) == "undefined") {
      postPopulate = false;
    }

    var request = Tapedeck.Frontend.Messenger.newRequest({
      action        : "getView",
      viewName      : viewName,
      postPopulate  : postPopulate
    }, callback);

    if (packageName && packageName.length > 0) {
      request.packageName = packageName;
    }
    if (typeof(options) != "undefined" && options != null) {
      request.options = options;
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

  chooseFeed: function(feedName) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action : "chooseFeed",
      feedName  : feedName,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  getCSS: function(callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "getCSS",
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  getRepeat: function(callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "getRepeat",
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  getSync: function(callback) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "getSync",
    }, callback);
    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  toggleRepeat: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "toggleRepeat",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  toggleSync: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "toggleSync",
    });
    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  shuffleQueue: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "shuffleQueue",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  makePlaylist: function(playlistName) {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action       : "makePlaylist",
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
      self.log("Posting request: " + message.action, Tapedeck.Frontend.Utils.DEBUG_LEVELS.ALL);
    }
    else if (message.type == "response") {
      self.log("Posting response - callback: " + message.callbackID,
               Tapedeck.Frontend.Utils.DEBUG_LEVELS.ALL);
    }

    self.port.postMessage(message);
  },

  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";

    if (typeof(callback) != "undefined") {
      // the time should be unique enough to prevent most collisions
      var cbID = new Date().getTime();
      while (cbID in Tapedeck.Frontend.Messenger.pendingCallbacks) {
        // increment until we're out of collisions
        cbID = cbID + 1;
      }
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
    Tapedeck.Frontend.Utils.log("Messenger", str, level);
  },

  clear: function() {
    var request = Tapedeck.Frontend.Messenger.newRequest({
      action  : "clear",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
};

