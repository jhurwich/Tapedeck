Tapedeck.Backend.MessageHandler = {

  ports: {},
  init: function() {
    // listen for new pages to inject our content into
    chrome.tabs.onUpdated.addListener(this.updatedListener);
  
    // ports are used for communication with each of our player frames
    chrome.extension.onConnect.addListener(this.portListener);

    // Requests are used for communicating with items outside of the 
    // frame. In particular, this includes the quick buttons and
    // injected scripts.
    chrome.extension.onRequest.addListener(this.requestListener);

    chrome.tabs.onSelectionChanged.addListener(this.selectionListener);
  },

  waitingToLoad : { },
  updatedListener: function(tabID, changeInfo, tab) {
    var msgHandler = Tapedeck.Backend.MessageHandler;

    // Handle url updates
    if (typeof(changeInfo.url) != "undefined") {
      
      // now make sure it's not supposed to be blocked
      if (!msgHandler.isURLBlocked(changeInfo.url)) {
        // url was just set, mark associate the tabID to the url and
        // wait for the completed event from that tabID
        msgHandler.waitingToLoad[tabID] = changeInfo.url;
        
        // Everything looks good.  Number 1, inject!
        msgHandler.injectInto(tabID);
      }
    }

    // Handle status == 'complete' updates
    if (typeof(changeInfo.status) != "undefined" &&
        changeInfo.status == "complete") {
          
      // we got a completed event, make sure that we expected it
      var url = msgHandler.waitingToLoad[tabID];
      msgHandler.waitingToLoad[tabID] = null;
      
      if (typeof(url) == "undefined" || url == null) {
        console.log("Got a load complete event for unknown tabID: '" +
                    tab.url + "'");
        return;
      }

      // TODO trigger some load-complete event here?
    }
  },

  isURLBlocked: function(url) {
    var blockList = Tapedeck.Backend.Bank.getBlockList();
    for (var i = 0; i < blockList.length; i++) {
      var pattern = blockList[i];
      if (url.match(pattern) != null) {
        // url is blocked
        return true;
      }
    }
    return false;
  },

  injectInto: function(tabID) {
    chrome.tabs.insertCSS(tabID, {file: "frontend/tapedeck-inject-all.css"});
    chrome.tabs.executeScript(tabID, {file: "vendor/jquery-1.6.2.js"});
    chrome.tabs.executeScript(tabID, {file: "frontend/tapedeck-inject-all.js"});
  },

  portListener: function(port) {
    var self = Tapedeck.Backend.MessageHandler;
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
    
    var self = Tapedeck.Backend.MessageHandler;
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
        sendResponse({ });
        break;
      
      default:
        console.error("Unexpected request action '" + request.action + "'");
        break;
    }
  },

  selectionListener: function(tabID, selectInfo) {
    var self = Tapedeck.Backend.MessageHandler;
    chrome.tabs.get(tabID, function(tab) {
      var rendered = Tapedeck.Backend.TemplateManager
                                     .renderView("Frame",
                                                 { tabID: tabID });

      var viewString = $('<div>').append($(rendered))
                                 .remove()
                                 .html();

      self.pushView("tapedeck-content", viewString, tab);
    });
  },

  postMessage: function(tabID, message) {
    var ports = Tapedeck.Backend.MessageHandler.ports;
    if (typeof(ports[tabID]) != "undefined") {
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

  handleRequest: function(port, request) {
    if (request.type != "request") {
      return;
    }

    var sqcr = Tapedeck.Backend.Sequencer;
    var bank = Tapedeck.Backend.Bank;
    var response = Tapedeck.Backend.MessageHandler.newResponse(request);
    
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
        Tapedeck.Backend.MessageHandler.postMessage(port.tab.id,
                                                    response);
        break;

      case "requestUpdate":
        var updateType = request.updateType.charAt(0).toUpperCase() +
                         request.updateType.slice(1);
        var updateFnName = "update" + updateType;
        Tapedeck.Backend.MessageHandler[updateFnName](port.tab);
        break;

      case "download":
        var callback = function(url) {
          response.url = url;
          Tapedeck.Backend.MessageHandler.postMessage(port.tab.id,
                                                       response);
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
        Tapedeck.Backend.MessageHandler.postMessage(port.tab.id,
                                                    response);
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
        Tapedeck.Backend.MessageHandler.postMessage(port.tab.id,
                                                    response);
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
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.updatePlayer(selectedTab);
      });
      return;
    }

    var playerView = Tapedeck.Backend.TemplateManager
                                     .renderView("Player", { });
    this.pushView("player", playerView, tab);
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
    if (typeof(tab) == "undefined") {
      console.log("pushing to undefined tab");
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.pushView(targetID,
                                                  view,
                                                  selectedTab);
      });
      return;
    }
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

  executeScript: function(tab, options, responseCallback) {
    var self = Tapedeck.Backend.MessageHandler;
    
    if (typeof(responseCallback) != "undefined") {
      var wrappedCallback = function(response, sender, sendResponse) {
        responseCallback(response, sender, sendResponse);
        
        chrome.extension.onRequest.removeListener(arguments.callee);
      }
      chrome.extension.onRequest.addListener(wrappedCallback);
    }
    
    if (!Tapedeck.Backend.MessageHandler.isTest(tab.url)) {
      if (!self.isURLBlocked(tab.url)) {
        chrome.tabs.executeScript(tab.id, options);
      }
    }
    else {
      var request = Tapedeck.Backend.MessageHandler.newRequest({
        action: "executeScriptInTest",
        script: options.file,
      });

      self.postMessage(tab.id, request);
    }
  },

  isTest: function(url) {
    var match = url.match(/chrome-extension.*SpecRunner.html$/);
    return (match != null);
  },

};
