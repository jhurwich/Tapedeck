Tapedeck.Backend.MessageHandler = {

  ports: {},
  init: function() {
    // ports are used for communication with each of our player frames
    chrome.extension.onConnect.addListener(this.portListener);

    // Requests are used for communicating with items outside of the
    // frame. In particular, this includes the quick buttons and
    // injected scripts.
    chrome.extension.onRequest.addListener(this.requestListener);

    // A listener to communicate with the sandbox
    window.addEventListener('message', this.sandboxListener);
  },

  portListener: function(port) {
    var self = Tapedeck.Backend.MessageHandler;

    // we seem to get multiple connection requests for the same tab
    if (typeof(self.ports[port.sender.tab.id]) != "undefined" &&
        self.ports[port.sender.tab.id]) {
      return;
    }
    self.log("Port connecting: " + port.sender.tab.id);
    self.ports[port.sender.tab.id] = port;

    port.onMessage.addListener(self.handleMessage.curry(port));
    port.onMessage.addListener(self.handleResponse);

    port.onDisconnect.addListener(function() {
      self.log("Port disconnecting: " + port.sender.tab.id);
      self.ports[port.sender.tab.id] = null;
    });
  },

  MAX_REGISTER_SIZE: 400,
  requestRegister: {},
  requestListener: function(request,
                            sender,
                            sendResponse) {
    var self = Tapedeck.Backend.MessageHandler;

    // Injected scripts also transmit with requests, but their
    // requests don't have actions.
    if (typeof(request.action) == "undefined") {
      return;
    }

    // all requests must have a requestID to prevent duplicates
    if (typeof(request.requestID) == "undefined") {
      console.error("Request without requestID: " + request.action);
      return;
    }
    else {
      // returns true if the request has been received before and maintains the requestRegister
      var checkRegister = function(rID) {

        // check if a request with that id has been made before
        if (rID in self.requestRegister) {
          return true;
        }
        else {
          self.requestRegister[rID] = true;
        }

        // this is a new request
        var requestIDs = Object.keys(self.requestRegister).sort();
        var registerSize = requestIDs.length;

        // register has grown too large, clear everything but the 25% most recent
        if (registerSize >= self.MAX_REGISTER_SIZE) {
          while(registerSize >= 0.25 * self.MAX_REGISTER_SIZE) {
            var removedID = requestIDs.shift();
            delete self.requestRegister[removedID];
            registerSize--;
            console.log("*******too many requests, reduced to " + registerSize);
          }
        }
        return false;
      };

      // this request was seen before
      if (checkRegister(request.requestID)) {
        console.error("Duplicate request: " + request.action + " (" + request.requestID + ")");
        return;
      }
    }

    var str = "Request received: " + request.action;
    str += ((sender.tab == null) ? " from outside tabs"
                                 : " from tab " + sender.tab.id);
    self.log(str);

    switch (request.action) {
      case "add_tracks":
        self.addTracks(request.tracks);
        break;

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
          var request = Tapedeck.Backend.Utils.newRequest({ action : "setDrawer",
                                                            opened : request.opened });
          chrome.tabs.sendRequest(parseInt(tabID, 10), request);
        }
        break;

      case "getPackages":
        sendResponse({ packages: Tapedeck.Backend.TemplateManager.getPackages(),
                       currentPackage: Tapedeck.Backend.TemplateManager.currentPackage });
        break;
      case "setPackage":
        Tapedeck.Backend.TemplateManager.setPackage(request.name);
        break;
      case "getBlockList":
        var blockListStr = JSON.stringify(Tapedeck.Backend.Bank.getBlockList());
        sendResponse({ blockList: blockListStr });
        break;
      case "saveBlockList":
        Tapedeck.Backend.Bank.saveBlockList(JSON.parse(request.blockList));
        sendResponse({ });
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
               Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);
    } else {
      self.log("(" + currentTime.getTime() + ")Posting response message '" + message.callbackID + "' to tab: " + tabID,
               Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);
    }

    if (typeof(ports[tabID]) != "undefined" &&
        ports[tabID] != null) {
      ports[tabID].postMessage(message);
    }
  },

  handleResponse: function(response) {
    if (response.type != "response") {
      return;
    }

    var callbacks = Tapedeck.Backend.Utils.pendingCallbacks;
    if (response.callbackID in callbacks &&
        callbacks[response.callbackID]) {
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

    var response = Tapedeck.Backend.Utils.newResponse(request);

    self.log("Received message: " + request.action + " from tab " + port.sender.tab.id);

    switch(request.action)
    {
      case "requestUpdate":
        var updateType = request.updateType.charAt(0).toUpperCase() +
                         request.updateType.slice(1);

        // Sliders aren't views, but can be updated specially
        if (updateType.indexOf("Slider") == -1) {
          Tapedeck.Backend.TemplateManager.renderViewAndPush(updateType, request.pushHollowFirst, port.sender.tab);
        }
        else if (updateType == "SeekSlider") {
          Tapedeck.Backend.MessageHandler.updateSeekSlider(port.sender.tab);
        }
        else if (updateType == "VolumeSlider") {
          Tapedeck.Backend.MessageHandler.updateVolumeSlider(port.sender.tab);
        }
        break;

      case "download":
        var callback = function(fileData) {
          response.url = fileData.url;
          response.fileName = fileData.fileName;
          self.postMessage(port.sender.tab.id, response);
        };
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
          var index = parseInt(request.index, 10);
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
          var destination = parseInt(request.index, 10);
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

      case "chooseFeed":
        var feedName = request.feedName;
        Tapedeck.Backend.CassetteManager.chooseFeed(feedName);
        break;

      case "toggleRepeat":
        bank.toggleRepeat();
        break;

      case "toggleSync":
        bank.toggleSync();
        break;

      case "getCSS":
        response.cssURL = Tapedeck.Backend.TemplateManager.getCSSURL();
        self.postMessage(port.sender.tab.id, response);
        break;

      case "getRepeat":
        response.repeat = bank.getRepeat();
        self.postMessage(port.sender.tab.id, response);
        break;

      case "getSync":
        response.sync = bank.getSync();
        self.postMessage(port.sender.tab.id, response);
        break;

      case "makePlaylist":
        if (sqcr.queue.length === 0) {
          return;
        }

        var playlist = sqcr.queue.makePlaylist(request.playlistName);
        break;

      case "shuffleQueue":
        sqcr.shuffle();
        break;

      case "clearQueue":
        sqcr.clear();
        break;

      case "playIndex":
        var index = parseInt(request.index, 10);
        sqcr.playIndex(index);
        break;

      case "queueAndPlayNow":
        var track = bank.getTrack(request.trackID);
        var nextPos = sqcr.queuePosition + 1;
        sqcr.insertAt(track, nextPos);
        sqcr.next();
        break;

      case "browsePrevPage":
        Tapedeck.Backend.CassetteManager.browsePrevPage();
        break;
      case "setPage":
        Tapedeck.Backend.CassetteManager.setPage(request.page);
        break;
      case "browseNextPage":
        Tapedeck.Backend.CassetteManager.browseNextPage();
        break;

      case "setCassette":
        Tapedeck.Backend.CassetteManager.setCassette(request.cassetteID);
        break;

      case "removeCassette":
        Tapedeck.Backend.CassetteManager.removeCassette(request.cassetteID);
        break;

      case "cassettify":
        Tapedeck.Backend.CassetteManager.Cassettify.start();
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
        self.postMessage(port.sender.tab.id, response);
        break;

      case "clear":
        Tapedeck.Backend.Bank.clear(function() {
          self.postMessage(port.sender.tab.id, response);
        });
        break;

      case "getLogs":
        response.logs = Tapedeck.Backend.Utils.logLevels;
        self.postMessage(port.sender.tab.id, response);
        break;

      case "saveOptions":
        Tapedeck.Backend.Bank.saveOptions(request.options, function() {
          var unflattened = Tapedeck.Backend.OptionsManager.unflatten(request.options);
          Tapedeck.Backend.OptionsManager.enactOptions(unflattened, function () {
            self.postMessage(port.sender.tab.id, response);
          });
        });
        break;

      case "runTests":
        var testURL = chrome.extension.getURL("/spec/SpecRunner.html");
        chrome.tabs.create({ url: testURL });
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

  // Basic mutex.  Push tracks to queue if lock is held.
  addTrackAvailable: true,
  addTracksQueued: [ ],
  addTracks: function(newTracks, tab, callback) {
    var msgHandler = Tapedeck.Backend.MessageHandler;
    var cMgr = Tapedeck.Backend.CassetteManager;

    // Can only add tracis if there's a cassette being browsed
    if (typeof(cMgr.currentCassette) == "undefined" || cMgr.currentCassette == null) {
      return;
    }
    if (newTracks.length > 0 &&
        newTracks[0].cassette != cMgr.currentCassette.get("name")) {
      console.error("Received tracks for '" + newTracks[0].cassette +
                    "' when currentCassette is '" + cMgr.currentCassette.get("name") + "'");
      return;
    }

    if (!msgHandler.addTrackAvailable) {
      // We shifted the new tracks to the queue, and push empty array
      msgHandler.addTracksQueued = msgHandler.addTracksQueued.concat(newTracks);
      setTimeout(msgHandler.addTracks.curry([], tab, callback),
                 200);
      return;
    }
    if (typeof(newTracks) == "object") {
      if (typeof(newTracks.error) != "undefined") {
        console.error("Error adding more tracks: " + JSON.stringify(newTracks.error));
      }
      else if ($.isEmptyObject(newTracks)) {
        newTracks = [];
      }
    }
    msgHandler.log("Adding " + newTracks.length + " new tracks.");

    // pull in the queued tracks and blank the queue
    newTracks = newTracks.concat(msgHandler.addTracksQueued);
    msgHandler.addTracksQueued = [];
    if (newTracks.length === 0) {
      // if empty then nothing to do
      return;
    }
    msgHandler.addTrackAvailable = false;

    Tapedeck.Backend.Bank.getCurrentBrowseList(function(browseList){
      var origLen = browseList.length;

      // make sure there isn't already this track in the list
      var existingURLs = browseList.pluck("url");
      for (var i in newTracks) {
        var track = newTracks[i];

        if (jQuery.inArray(track.url, existingURLs) == -1) {
          browseList.add(track, { silent: true });
        }
      }

      if (browseList.length > origLen) {
        Tapedeck.Backend.Bank.saveCurrentBrowseList(browseList);
      }
      Tapedeck.Backend.MessageHandler.pushBrowseTrackList(browseList, tab);
      if (typeof(callback) !="undefined") {
        callback();
      }
    });
  },

  // browseTrackList == null means push the loading state, errorString and tab are optional
  pushBrowseTrackList: function(browseTrackList, errorString, tab) {
    if (typeof(errorString) != "undefined" && typeof(errorString) != "string") {
      tab = errorString;
      errorString = undefined;
    }
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.pushBrowseTrackList(browseTrackList,
                                                            errorString,
                                                            selectedTab);
      });
      return;
    }

    var cMgr = Tapedeck.Backend.CassetteManager;
    var msgHandler = Tapedeck.Backend.MessageHandler;

    msgHandler.addTrackAvailable = true;

    // Can only push a new browselist if there's a cassette being browsed
    if (typeof(cMgr.currentCassette) == "undefined" || cMgr.currentCassette == null) {
      return;
    }
    if (browseTrackList != null &&
        browseTrackList.length > 0 &&
        browseTrackList.at(0).get("cassette") != cMgr.currentCassette.get("name")) {
      return;
    }

    var options = {
      currentCassette : cMgr.currentCassette,
      currentPage : cMgr.currPage,
      browseList : browseTrackList
    };
    if (typeof(errorString) != "undefined") {
      options.errorString = errorString;
    }

    Tapedeck.Backend.TemplateManager.renderViewWithOptions("BrowseList", options, function(browseView) {
      Tapedeck.Backend.MessageHandler.pushView(browseView.el,
                                               browseView.proxyEvents,
                                               browseView.proxyImages,
                                               tab);
    });
  },

  updateSeekSlider: function(tab) {
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.updateSeekSlider(selectedTab);
      });
      return;
    }
    var track = Tapedeck.Backend.Sequencer.getCurrentTrack();

    var request = Tapedeck.Backend.Utils.newRequest({
      action: "updateSeekSlider",
      currentTime: track.get("currentTime"),
      duration: track.get("duration")
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

    var request = Tapedeck.Backend.Utils.newRequest({
      action: "updateVolumeSlider",
      volume: volume
    });

    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  forceCheckSync: function(tab) {
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.forceCheckSync(selectedTab);
      });
      return;
    }

    var request = Tapedeck.Backend.Utils.newRequest({
      action: "forceCheckSync"
    });

    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  showModal: function(params, callback, cleanup, tab) {
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.MessageHandler.showModal(params,
                                                  callback,
                                                  cleanup,
                                                  selectedTab);
      });
      return;
    }

    // If we have a callback and/or cleanup prepare the finishing function.
    // NOTE: cleanup is not used anywhere yet, so this likely needs to be tweaked
    var finishUp = null;
    if (typeof(callback) != "undefined" && callback != null) {
      finishUp = function(response) {
        if (typeof(response.params) != "undefined") {
          // success callback
          response.params.tab = tab;
          callback(response.params);
          return;
        }
        else if (typeof(cleanup) != "undefined") {
          // error callback (includes closing the modal)
          cleanup();
          return;
        }
      };
    }

    // The render callback will send the viewString to the frontend
    var handleRendered = function(rendered) {

      var viewString = $('<div>').append($(rendered.el))
                                 .remove()
                                 .html();

      // if there's a callback specified, finishUp will not be null
      var request = Tapedeck.Backend.Utils.newRequest({
        action: "showModal",
        view: viewString,
        proxyEvents: rendered.proxyEvents
      }, finishUp);

      Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
    };

    // render the modal
    Tapedeck.Backend.TemplateManager.renderViewWithOptions("Modal",
                                                           params,
                                                           handleRendered);
  },

  pushView: function(view, proxyEvents, proxyImages, tab) {
    var self = Tapedeck.Backend.MessageHandler;
    if (typeof(tab) == "undefined") {
      self.getSelectedTab(function(selectedTab) {
        self.pushView(view, proxyEvents, proxyImages, selectedTab);
      });
      return;
    }

    var viewString = $('<div>').append($(view))
                               .remove()
                               .html();

    var request = Tapedeck.Backend.Utils.newRequest({
      action: "pushView",
      view: viewString,
      proxyEvents : proxyEvents,
      proxyImages : proxyImages
    });

    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  signalLoadComplete: function(tab) {
    var request = Tapedeck.Backend.Utils.newRequest({
      action: "loadComplete"
    });

    Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
  },

  // tab is optional
  setLogs: function(object, tab, callback) {
    var self = Tapedeck.Backend.MessageHandler;
    if (arguments.length < 3) {
      self.getSelectedTab(function(selectedTab) {
        self.setLogs(object, selectedTab, tab);
      });
      return;
    }

    var request = Tapedeck.Backend.Utils.newRequest({
      action: "setLogs",
      logs: object
    });

    self.messageSandbox(request, callback);
  },

  sandboxCallbacks: {},
  messageSandbox: function(message, callback) {
    if (typeof(callback) != "undefined" && callback != null) {
      Tapedeck.Backend.MessageHandler.sandboxCallbacks[message.requestID] = callback;
    }
    $("#sandbox").get(0).contentWindow.postMessage(message, "*");
  },

  sandboxListener: function(event) {
    if (event.data.type == "response") {
      Tapedeck.Backend.MessageHandler.sandboxCallbacks[event.data.callbackID](event.data);
    }
    else {
      var request = event.data;
      switch (request.action) {
        case "addTracks":
          Tapedeck.Backend.MessageHandler.addTracks(request.tracks, request.tab);
          break;

        case "getLogLevels":
          Tapedeck.Backend.MessageHandler.setLogs(Tapedeck.Backend.Utils.logLevels,
                                                  null,
                                                  function() { });
          break;

        case "sandboxInitialized":
          Tapedeck.Backend.Bank.sandboxReady = true;
          break;

        case "executeScript":
          var callback = function(response) {
            response.action = 'response';
            var sendResponse = Tapedeck.Backend.Utils.newResponse(request, response);
            $("#sandbox").get(0).contentWindow.postMessage(sendResponse, "*");
          };
          Tapedeck.Backend.InjectManager.executeScript(request.tab, request.options, callback, request.testParams, request.prepCode);
          break;

        case "ajax":
          var msgHandler = Tapedeck.Backend.MessageHandler;
          request.params.success = function(data, textStatus, xhr) {
            var response = Tapedeck.Backend.Utils.newResponse(request,
                                                              { action: 'response',
                                                                responseText: xhr.responseText });
            $("#sandbox").get(0).contentWindow.postMessage(response, "*");
          };

          request.params.error = function(data, textStatus, jqXHR) {
            console.error("Error performing ajax on behalf of Sandbox");
            var response = Tapedeck.Backend.Utils.newResponse(request,
                                                              { action: 'response',
                                                                error : "Ajax error" });
            $("#sandbox").get(0).contentWindow.postMessage(response, "*");
          };
          msgHandler.log("Performing ajax request for Sandbox to '" + request.params.url + "'");
          $.ajax(request.params);
          break;

        default:
          throw new Error("MessageHandler's sandboxListener was sent an unknown action: '" + request.action + "'");
      }
    }
  },

  log: function(str, level) {
    Tapedeck.Backend.Utils.log("MessageHandler", str, level);
  }
};
