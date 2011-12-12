Tapedeck.Backend.MessageHandler = {

  DEBUG_LEVELS: {
    NONE  : 0,
    BASIC : 1,
    ALL   : 2,
  },
  debug: 0,

  ports: {},
  init: function() {
    // ports are used for communication with each of our player frames
    chrome.extension.onConnect.addListener(this.portListener);

    // Requests are used for communicating with items outside of the 
    // frame. In particular, this includes the quick buttons and
    // injected scripts.
    chrome.extension.onRequest.addListener(this.requestListener);
  },

  portListener: function(port) {
    var self = Tapedeck.Backend.MessageHandler;
    self.log("Port connecting: " + port.tab.id);
    self.ports[port.tab.id] = port;

    port.onMessage.addListener(self.handleMessage.curry(port));
    port.onMessage.addListener(self.handleResponse);

    port.onDisconnect.addListener(function() {
      self.log("Port disconnecting: " + port.tab.id);
      self.ports[port.tab.id] = null;
    });
  },

  requestListener: function(request,
                            sender,
                            sendResponse) {
    // Injected scripts also transmit with requests, but their
    // requests don't have actions.
    if (typeof(request.action) == "undefined") {
      return;
    }
    
    var self = Tapedeck.Backend.MessageHandler;
    self.log("Request received: " + request.action + " from tab " + sender.tab.id);
    
    switch (request.action) {
      case "play_pause":
        var state = Tapedeck.Backend.Sequencer.getCurrentState();
        if (state == "play") {
          Tapedeck.Backend.Sequencer.pause();
        } else {
          Tapedeck.Backend.Sequencer.playNow();
        }
        break;
      case "next":
        Tapedeck.Backend.Sequencer.next();
        break;
      case "prev":
        Tapedeck.Backend.Sequencer.prev();
        break;

      case "checkDrawer":
        var open = Tapedeck.Backend.Bank.getDrawerOpened();
        sendResponse({ opened: open });
        break;
      case "setDrawer":
        Tapedeck.Backend.Bank.setDrawerOpened(request.opened);

        // echo to all tabs
        for (var tabID in self.ports) {
          var request = self.newRequest({ action : "setDrawer",
                                          opened : request.opened });
          chrome.tabs.sendRequest(parseInt(tabID), request);
        }
        break;

      case "getBlockList":
        var blockListStr = Tapedeck.Backend.Bank.getBlockListStr();
        sendResponse({ blockList: blockListStr });
        break;
      case "saveBlockList":
        Tapedeck.Backend.Bank.saveBlockListStr(request.blockList);
        sendResponse({ blockList: blockListStr });
        break;
      
      default:
        console.error("Unexpected request action '" + request.action + "'");
        break;
    }
  },

  postMessage: function(tabID, message) {
    var self = Tapedeck.Backend.MessageHandler;
    var ports = self.ports;
    var currentTime = new Date();
    if (typeof(message.action) != "undefined") {
      self.log("(" + currentTime.getTime() + ") Posting action message '" + message.action + "' to tab: " + tabID,
               self.DEBUG_LEVELS.ALL);
    } else {
      self.log("(" + currentTime.getTime() + ")Posting response message '" + message.callbackID + "' to tab: " + tabID,
               self.DEBUG_LEVELS.ALL);
    }
    
    if (typeof(ports[tabID]) != "undefined" &&
        ports[tabID] != null) {
      ports[tabID].postMessage(message);
    }
  },
  
  pendingCallbacks: {},
  handleResponse: function(response) {
    if (response.type != "response") {
      return;
    }
    
    var callbacks = Tapedeck.Backend.MessageHandler.pendingCallbacks;
    if (response.callbackID in callbacks) {
      callbacks[response.callbackID](response);
    }
  },

  handleMessage: function(port, request) {
    if (request.type != "request") {
      return;
    }

    var self = Tapedeck.Backend.MessageHandler;
    var sqcr = Tapedeck.Backend.Sequencer;
    var bank = Tapedeck.Backend.Bank;
    
    var response = self.newResponse(request);

    self.log("Received message: " + request.action + " from tab " + port.tab.id);
    
    switch(request.action)
    {
      case "getView":
        var scriptName = request.viewName;
        var packageName = (request.packageName ? request.packageName : null);
        
        request.options["tabID"] = port.tab.id;
        var rendered = Tapedeck.Backend.TemplateManager.renderView
                                (scriptName, request.options, packageName);

        var viewString = $('<div>').append($(rendered))
                                   .remove()
                                   .html();
                                   
        response.view = viewString;
        self.postMessage(port.tab.id, response);
        break;

      case "requestUpdate":
        var updateType = request.updateType.charAt(0).toUpperCase() +
                         request.updateType.slice(1);
        var updateFnName = "update" + updateType;
        self[updateFnName](port.tab);
        break;

      case "download":
        var callback = function(url) {
          response.url = url;
          self.postMessage(port.tab.id, response);
        }
        bank.FileSystem.download(request.trackID, callback);
        break;

      case "finishDownload":
        bank.FileSystem.removeTrack(request.trackID);
        break;

      case "queueTracks":
        var tracks = [];
        if (typeof(request.trackObjs) != "undefined") {
          // tracks were sent as crude track objs
          $.map(request.trackObjs, function(trackObj, i) {
            var track = bank.getTrack(trackObj.trackID);
            tracks.push(track);
          });
        }
        else {
          // tracks were sent as trackIDs
          $.map(request.trackIDs, function(trackID, i) {
            var track = bank.getTrack(trackID);
            tracks.push(track);
          });
        }

        if (typeof(request.index) != "undefined") {
          var index = parseInt(request.index);
          sqcr.insertSomeAt(tracks, index);
        }
        else {
          var endPos = sqcr.queue.length;
          sqcr.insertSomeAt(tracks, endPos);
        }
        break;
        
      case "moveTracks":
        var trackIndexPairs = [];
        if (typeof(request.trackObjs) == "undefined") {
          console.error("Cannot moveTracks using only trackIDs, must have each tracks index");
          return;
        }
        
        $.map(request.trackObjs, function(trackObj, i) {
          var track = bank.getTrack(trackObj.trackID);
          trackIndexPairs.push({ track: track, index: trackObj.index });
        });

        if (typeof(request.index) != "undefined") {
          var destination = parseInt(request.index);
          sqcr.moveSomeTo(trackIndexPairs, destination);
        }
        else {
          var endPos = sqcr.queue.length;
          sqcr.moveSomeTo(trackIndexPairs, endPos);
        }
        break;

      case "removeQueuedAt":
        sqcr.removeAt(request.pos);
        break;

      case "playPlaylist":
        var playlist = bank.getPlaylists().at(request.index);
        sqcr.playPlaylist(playlist);
        break;

      case "removePlaylist":
        var playlist = bank.getPlaylists().at(request.index);
        bank.removePlaylist(playlist);
        break;

      case "toggleRepeat":
        bank.toggleRepeat();
        break;

      case "getRepeat":
        response.repeat = bank.getRepeat();
        self.postMessage(port.tab.id, response);
        break;
        
      case "saveQueue":
        if (sqcr.queue.length == 0) {
          return;
        }
        
        var playlist = sqcr.queue.makePlaylist(request.playlistName);
        
        bank.savePlaylist(playlist);
        break;

      case "shuffleQueue":
        sqcr.shuffle();
        break;

      case "clearQueue":
        sqcr.clear();
        break;

      case "playIndex":
        var index = parseInt(request.index);
        sqcr.playIndex(index);
        break;

      case "queueAndPlayNow":
        var track = bank.getTrack(request.trackID);
        var nextPos = sqcr.queuePosition + 1;
        sqcr.insertAt(track, nextPos);
        sqcr.next();
        break;

      case "setCassette":
        Tapedeck.Backend.CassetteManager.setCassette(request.cassetteID);
        break;

      case "loadLink":
        var url = request.url.replace("http://", "");
        chrome.tabs.create({ url: ("http://" + url) });
        break;

      case "seek":
        var percent = request.percent;
        sqcr.Player.seekPercent(percent);
        break;

      case "setVolume":
        sqcr.Player.setVolume(request.percent);
        bank.saveVolume(request.percent);
        break;
        
      case "getVolume":
        response.volume = bank.getVolume();
        self.postMessage(port.tab.id, response);
        break;
        
      default:
        throw new Error("MessageHandler's handleMessage was sent an unknown action");
    }
  },

  getSelectedTab: function(callback) {
    chrome.windows.getLastFocused(function(focusWin) {
      chrome.tabs.getSelected(focusWin.id, function(selectedTab) {
        callback(selectedTab);
      });
    });
  },

  updatePlayer: function(tab) {
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.updatePlayer(selectedTab);
      });
      return;
    }

    var playerView = Tapedeck.Backend.TemplateManager
                                     .renderView("Player", { });
    this.pushView("player", playerView, tab);
  },

  updateBrowseList: function(tab) {
    var cMgr = Tapedeck.Backend.CassetteManager;

    if (cMgr.currentCassette != null) {
      var context = Tapedeck.Backend.Utils.getContext(tab);

      cMgr.currentCassette.getBrowseList(context, function(trackJSONs) {
        var browseTrackList = new Tapedeck.Backend.Collections.TrackList
                                                  (trackJSONs);
  
        Tapedeck.Backend.Bank.saveTracks(browseTrackList);
  
        var browseView = Tapedeck.Backend
                                 .TemplateManager
                                 .renderView("BrowseList",
                                             { trackList   : browseTrackList,
                                               currentCassette : cMgr.currentCassette });

        Tapedeck.Backend.MessageHandler.pushView("browse-list",
                                                 browseView,
                                                 tab);
      });
    }
  },

  updateSeekSlider: function(tab) {
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.updateSeekSlider(selectedTab);
      });
      return;
    }
    var track = Tapedeck.Backend.Sequencer.getCurrentTrack();
    
    var request = Tapedeck.Backend.MessageHandler.newRequest({
      action: "updateSeekSlider",
      currentTime: track.get("currentTime"),
      duration: track.get("duration"),
    });
    
    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  updateVolumeSlider: function(tab) {
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.updateVolumeSlider(selectedTab);
      });
      return;
    }
    var volume = Tapedeck.Backend.Bank.getVolume();
    
    var request = Tapedeck.Backend.MessageHandler.newRequest({
      action: "updateVolumeSlider",
      volume: volume,
    });
    
    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  pushView: function(targetID, view, tab) {
    var self = Tapedeck.Backend.MessageHandler;
    if (typeof(tab) == "undefined") {
      self.log("Pushing to undefined tab: " + targetID);
      
      self.getSelectedTab(function(selectedTab) {
        self.pushView(targetID, view, selectedTab);
      });
      return;
    }
    self.log("Pushing view to '" + targetID + "' in tab " + tab.id);
    
    var viewString = $('<div>').append($(view))
                               .remove()
                               .html();

    var request = Tapedeck.Backend.MessageHandler.newRequest({
      action: "pushView",
      view: viewString,
      targetID: targetID,
    });

    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  signalLoadComplete: function(tab) {
    var request = Tapedeck.Backend.MessageHandler.newRequest({
      action: "loadComplete",
    });

    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";

    if (typeof(callback) != "undefined") {
      var cbID = new Date().getTime();
      Tapedeck.Backend.MessageHandler.pendingCallbacks[cbID] = callback;
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

  log: function(str, level) {
    var self = Tapedeck.Backend.MessageHandler;
    if (self.debug == self.DEBUG_LEVELS.NONE) {
      return;
    }
    if (typeof(level) == "undefined") {
      level = self.DEBUG_LEVELS.BASIC;
    }
    if (self.debug >= level) {
      var currentTime = new Date();
      console.log("MsgHdlr (" + currentTime.getTime() + ") : " + str);
    }
  }
};
