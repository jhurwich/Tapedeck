Einplayer.Backend.MessageHandler = {

  ports: {},
  init: function() {

    // ports are used for communication with each of our player frames
    chrome.extension.onConnect.addListener(this.portListener);

    // Requests are used for communicating with items outside of the 
    // frame. In particular, this includes the quick buttons and
    // injected scripts.
    chrome.extension.onRequest.addListener(this.requestListener);

    chrome.tabs.onSelectionChanged.addListener(this.selectionListener);
  },

  portListener: function(port) {
    var self = Einplayer.Backend.MessageHandler;
    self.ports[port.tab.id] = port;

    port.onMessage.addListener(self.handleRequest.curry(port));
    port.onMessage.addListener(self.handleResponse);

    port.onDisconnect.addListener(function() {
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
    
    var self = Einplayer.Backend.MessageHandler;
    switch (request.action) {
      case "play_pause":
        var state = Einplayer.Backend.Sequencer.getCurrentState();
        if (state == "play") {
          Einplayer.Backend.Sequencer.pause();
        } else {
          Einplayer.Backend.Sequencer.playNow();
        }
        break;
      case "next":
        Einplayer.Backend.Sequencer.next();
        break;
      case "prev":
        Einplayer.Backend.Sequencer.prev();
        break;

      case "checkDrawer":
        var open = Einplayer.Backend.Bank.getDrawerOpened();
        sendResponse({ opened: open });
        break;
      case "setDrawer":
        Einplayer.Backend.Bank.setDrawerOpened(request.opened);

        // echo to all tabs
        for (var tabID in self.ports) {
          var request = self.newRequest({ action : "setDrawer",
                                          opened : request.opened });
          chrome.tabs.sendRequest(parseInt(tabID), request);
        }
        break;
      
      default:
        console.error("Unexpected request action '" + request.action + "'");
        break;
    }
  },

  selectionListener: function(tabID, selectInfo) {
    var self = Einplayer.Backend.MessageHandler;
    chrome.tabs.get(tabID, function(tab) {
      var rendered = Einplayer.Backend.TemplateManager
                                      .renderView("Frame",
                                                  { tabID: tabID });

      var viewString = $('<div>').append($(rendered))
                                 .remove()
                                 .html();

      self.pushView("einplayer-content", viewString, tab);
    });
  },

  postMessage: function(tabID, message) {
    var ports = Einplayer.Backend.MessageHandler.ports;
    if (typeof(ports[tabID]) != "undefined") {
      ports[tabID].postMessage(message);
    }
  },
  
  pendingCallbacks: {},
  handleResponse: function(response) {
    if (response.type != "response") {
      return;
    }
    
    var callbacks = Einplayer.Backend.MessageHandler.pendingCallbacks;
    if (response.callbackID in callbacks) {
      callbacks[response.callbackID](response);
    }
  },

  handleRequest: function(port, request) {
    if (request.type != "request") {
      return;
    }

    var sqcr = Einplayer.Backend.Sequencer;
    var response = Einplayer.Backend.MessageHandler.newResponse(request);
    
    switch(request.action)
    {
      case "getView":
        var scriptName = request.viewName;
        var packageName = (request.packageName ? request.packageName : null);
        
        request.options["tabID"] = port.tab.id;
        var rendered = Einplayer.Backend.TemplateManager.renderView
                                (scriptName, request.options, packageName);

        var viewString = $('<div>').append($(rendered))
                                   .remove()
                                   .html();
                                   
        response.view = viewString;
        Einplayer.Backend.MessageHandler.postMessage(port.tab.id,
                                                     response);
        break;

      case "requestUpdate":
        var updateType = request.updateType.charAt(0).toUpperCase() +
                         request.updateType.slice(1);
        var updateFnName = "update" + updateType;
        Einplayer.Backend.MessageHandler[updateFnName](port.tab);
        break;

      case "queueTracks":
        var tracks = [];
        if (typeof(request.trackObjs) != "undefined") {
          // tracks were sent as crude track objs
          $.map(request.trackObjs, function(trackObj, i) {
            var track = Einplayer.Backend.Bank.getTrack(trackObj.trackID);
            tracks.push(track);
          });
        }
        else {
          // tracks were sent as trackIDs
          $.map(request.trackIDs, function(trackID, i) {
            var track = Einplayer.Backend.Bank.getTrack(trackID);
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
          var track = Einplayer.Backend.Bank.getTrack(trackObj.trackID);
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
        var playlist = Einplayer.Backend.Bank.getPlaylists().at(request.index);
        sqcr.playPlaylist(playlist);
        break;

      case "removePlaylist":
        var playlist = Einplayer.Backend.Bank.getPlaylists().at(request.index);
        Einplayer.Backend.Bank.removePlaylist(playlist);
        break;

      case "saveQueue":
        if (sqcr.queue.length == 0) {
          return;
        }
        
        var playlist = sqcr.queue.makePlaylist(request.playlistName);
        
        Einplayer.Backend.Bank.savePlaylist(playlist);
        break;

      case "clearQueue":
        sqcr.clear();
        break;

      case "playIndex":
        var index = parseInt(request.index);
        sqcr.playIndex(index);
        break;

      case "queueAndPlayNow":
        var track = Einplayer.Backend.Bank.getTrack(request.trackID);
        var nextPos = sqcr.queuePosition + 1;
        sqcr.insertAt(track, nextPos);
        sqcr.next();
        break;

      case "seek":
        var percent = request.percent;
        sqcr.Player.seekPercent(percent);
        break;
        
      default:
        throw new Error("MessageHandler's handleRequest was sent an unknown action");
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
      Einplayer.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Einplayer.Backend.MessageHandler.updatePlayer(selectedTab);
      });
      return;
    }

    var playerView = Einplayer.Backend.TemplateManager
                                      .renderView("Player", { })
    this.pushView("player", playerView, tab);
  },

  updateSlider: function(tab) {
    if (typeof(tab) == "undefined") {
      Einplayer.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Einplayer.Backend.MessageHandler.updateSlider(selectedTab);
      });
      return;
    }
    var track = Einplayer.Backend.Sequencer.getCurrentTrack();
    
    var request = Einplayer.Backend.MessageHandler.newRequest({
      action: "updateSlider",
      currentTime: track.get("currentTime"),
      duration: track.get("duration"),
    });
    
    Einplayer.Backend.MessageHandler.postMessage(tab.id, request);
  },

  pushView: function(targetID, view, tab) {
    if (typeof(tab) == "undefined") {
      console.log("pushing to undefined tab");
      Einplayer.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Einplayer.Backend.MessageHandler.pushView(targetID,
                                                  view,
                                                  selectedTab);
      });
      return;
    }
    var viewString = $('<div>').append($(view))
                               .remove()
                               .html();

    var request = Einplayer.Backend.MessageHandler.newRequest({
      action: "pushView",
      view: viewString,
      targetID: targetID,
    });

    Einplayer.Backend.MessageHandler.postMessage(tab.id, request);
  },

  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";

    if (typeof(callback) != "undefined") {
      var cbID = new Date().getTime();
      Einplayer.Backend.MessageHandler.pendingCallbacks[cbID] = callback;
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

  executeScript: function(tab, options, responseCallback) {
    if (typeof(responseCallback) != "undefined") {
      var wrappedCallback = function(response, sender, sendResponse) {
        responseCallback(response, sender, sendResponse);
        
        chrome.extension.onRequest.removeListener(arguments.callee);
      }
      chrome.extension.onRequest.addListener(wrappedCallback);
    }
    
    if (!Einplayer.Backend.MessageHandler.isTest(tab.url)) {
      chrome.tabs.executeScript(tab.id, options);
    }
    else {
      var request = Einplayer.Backend.MessageHandler.newRequest({
        action: "executeScriptInTest",
        script: options.file,
      });

      Einplayer.Backend.MessageHandler.postMessage(tab.id, request);
    }
  },

  isTest: function(url) {
    var match = url.match(/chrome-extension.*SpecRunner.html$/);
    return (match != null);
  },

};
