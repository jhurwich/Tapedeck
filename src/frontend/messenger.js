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

  handleResponse: function(response) {
    var msgr = Tapedeck.Frontend.Messenger;
    var utils = Tapedeck.Frontend.Utils;

    if (response.type != "response") {
      return;
    }

    if (response.callbackID in utils.pendingCallbacks &&
        utils.pendingCallbacks[response.callbackID]) {
      utils.pendingCallbacks[response.callbackID](response);

      if (typeof(response.dontClear) == "undefined" || !response.dontClear) {
        delete utils.pendingCallbacks[response.callbackID];
      }
    }
    else {
      if (typeof(response.view) != "undefined") {
        response.view = "<html_removed>";
      }
      if (typeof(response.proxyEvents) != "undefined") {
        response.proxyEvents = "<events_removed>";
      }

      // We only want to print this if we're not in the testTab.  The testTab is the only tab with
      // an accessible parent, so only print if the parent is inaccessible.
      if (msgr.inaccessibleParent != msgr.port.portId_) {
        try {
          var parentURL = parent.document.location.href;

          // parent is accessible
          msgr.inaccessibleParent = -1;
        }
        catch (e) {
          msgr.inaccessibleParent = msgr.port.portId_;

        }
      }
      if (msgr.inaccessibleParent == msgr.port.portId_) {
        console.error("Could not find callback '" + response.callbackID + "' for response: " + JSON.stringify(response));
      }
    }
  },

  handleRequest: function(request) {
    if (request.type != "request") {
      return;
    }
    var self = Tapedeck.Frontend.Messenger;

    var response = Tapedeck.Frontend.Utils.newResponse(request);
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
        Tapedeck.Frontend.Utils.replaceView(request.view,
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
    var request = Tapedeck.Frontend.Utils.newRequest({
      action     : "requestUpdate",
      updateType : updateType
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  getLogs: function(callback) {
    var request = Tapedeck.Frontend.Utils.newRequest({
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

    var request = Tapedeck.Frontend.Utils.newRequest({
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
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "seek",
      percent : percent
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  setVolume: function(percent) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "setVolume",
      percent : percent
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  download: function(trackID, callback) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "download",
      trackID : trackID
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  finishDownload: function(trackID) {
    var request = Tapedeck.Frontend.Utils.newRequest({
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

    var request = Tapedeck.Frontend.Utils.newTrackBasedRequest({
      action : "queueTracks",
      trackXs : trackXs
    });

    if (typeof(index) != "undefined") {
      request.index = index;
    }

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  moveTracks: function(trackObjs, index) {
    // can only move trackObjs because need each track's current index

    var request = Tapedeck.Frontend.Utils.newTrackBasedRequest({
      action : "moveTracks",
      trackXs : trackObjs
    });

    if (typeof(index) != "undefined") {
      request.index = index;
    }

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  removeQueuedAt: function(pos) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action : "removeQueuedAt",
      pos    : pos
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  playPlaylist: function(index) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action : "playPlaylist",
      index  : index,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  removePlaylist: function(index) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action : "removePlaylist",
      index  : index,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  chooseFeed: function(feedName) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action : "chooseFeed",
      feedName  : feedName,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  getCSS: function(callback) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action       : "getCSS",
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  getRepeat: function(callback) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action       : "getRepeat",
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  getSync: function(callback) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action       : "getSync",
    }, callback);
    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  toggleRepeat: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action       : "toggleRepeat",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  toggleSync: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action       : "toggleSync",
    });
    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  shuffleQueue: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action       : "shuffleQueue",
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  makePlaylist: function(playlistName) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action       : "makePlaylist",
      playlistName : playlistName,
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  clearQueue: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action   : "clearQueue"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  playIndex: function(index) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "playIndex",
      index : index
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  queueAndPlayNow: function(trackID) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "queueAndPlayNow",
      trackID : trackID
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  setCassette: function(cassetteID) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "setCassette",
      cassetteID : cassetteID
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  removeCassette: function(cassetteID) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "removeCassette",
      cassetteID : cassetteID
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  browsePrevPage: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "browsePrevPage"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  setPage: function(page) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "setPage",
      page    : page
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
  browseNextPage: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "browseNextPage"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  ejectCassette: function() {
    this.setCassette("");
  },

  cassettify: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "cassettify"
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  loadLink: function(url) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "loadLink",
      url : url
    });

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  saveOptions: function(options, callback) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "saveOptions",
      options : options
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },

  runTests: function() {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "runTests"
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

  log: function(str, level) {
    Tapedeck.Frontend.Utils.log("Messenger", str, level);
  },

  clear: function(callback) {
    var request = Tapedeck.Frontend.Utils.newRequest({
      action  : "clear",
    }, callback);

    Tapedeck.Frontend.Messenger.sendMessage(request);
  },
};

