Einplayer.Backend.MessageHandler = {

  ports: {},
  init: function() {
    var self = this;

    // ports are used for communication with each of our player frames
    chrome.extension.onConnect.addListener(function(port) {

      // port.name is a tabId
      self.ports[port.tab.id] = port;

      port.onMessage.addListener(self.handleRequest.curry(port));
      port.onMessage.addListener(self.handleResponse);

      port.onDisconnect.addListener(function() {
        self.ports[port.tab.id] = null;
      });
    });

    // requests are used for communicating with items outside of the frame
    // In particular, this includes the quick buttons
    chrome.extension.onRequest.addListener(function(request,
                                                    sender,
                                                    sendResponse) {
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
        default:
          console.error("Unexpected request action");
          break;
      }
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

      case "playTrack":
        var trackID = request.trackID;
        var track = Einplayer.Backend.Bank.getTrack(trackID);
        Einplayer.Backend.Sequencer.playTrack(track);
        break;

      case "seek":
        var time = request.time;
        Einplayer.Backend.Sequencer.Player.seek(time);
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
    
    var sqcr = Einplayer.Backend.Sequencer;
    var currentState = sqcr.getCurrentState();
    var request = Einplayer.Backend.MessageHandler.newRequest({
      action: "updatePlayer",
      state: currentState
    });
    if (currentState != sqcr.Player.STATES.STOP) {
      request.track = sqcr.getCurrentTrack().toJSON();
    }
    
    var ports = Einplayer.Backend.MessageHandler.ports;
    ports[tab.id].postMessage(request);
  },

  pushView: function(targetID, view, tab) {
    if (typeof(tab) == "undefined") {
      console.log("pushing to undefined view");
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
      action: "updateView",
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
