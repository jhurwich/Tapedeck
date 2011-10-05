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
        port.postMessage(response);
        break;

      case "requestUpdate":
        var updateType = request.updateType.charAt(0).toUpperCase() +
                         request.updateType.slice(1);
        var updateFnName = "update" + updateType;
        Einplayer.Backend.MessageHandler[updateFnName](port.tab);
        break;

      case "queueTracks":
        var trackIDs = request.trackIDs;
        var tracks = [];
        for (var i = 0; i < trackIDs.length; i++) {
          var track = Einplayer.Backend.Bank.getTrack(trackIDs[i]);
          tracks.push(track);
        }

        var index = request.index;
        if (typeof(index) != "undefined" &&
            request.index >= 0) {
          Einplayer.Backend.Sequencer.insertSomeAt(tracks, index);
        }
        else {
          var endPos = Einplayer.Backend.Sequencer.queue.length;
          Einplayer.Backend.Sequencer.insertSomeAt(tracks, endPos);
        }
        break;

      case "clearQueue":
        Einplayer.Backend.Sequencer.clear();
        break;

      case "playIndex":
        var index = parseInt(request.index);
        Einplayer.Backend.Sequencer.playIndex(index);
        break;

      case "seek":
        var percent = request.percent;
        Einplayer.Backend.Sequencer.Player.seekPercent(percent);
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

  getDocument: function(callback, tab) {
    if (typeof(tab) == "undefined") {
      Einplayer.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Einplayer.Backend.MessageHandler.getDocument(callback, selectedTab);
      });
      return;
    }

    var scrapeResponseHandler = function(response, sender, sendResponse) {
      if (sender.tab.id != tab.id) {
        console.log("response mismatch for page-scrape");
        return;
      }

      callback(response.document);
    };
    Einplayer.Backend.MessageHandler
                     .executeScript(tab,
                                    {allFrames: false,
                                     file: "frontend/scripts/document-fetcher.js"},
                                    scrapeResponseHandler);
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
    
    var ports = Einplayer.Backend.MessageHandler.ports;
    ports[tab.id].postMessage(request);
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

    var ports = Einplayer.Backend.MessageHandler.ports;
    ports[tab.id].postMessage(request);
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
      var port = Einplayer.Backend.MessageHandler.ports[tab.id];
      port.postMessage(request);
    }
  },

  isTest: function(url) {
    var match = url.match(/chrome-extension.*SpecRunner.html$/);
    return (match != null);
  },

};
