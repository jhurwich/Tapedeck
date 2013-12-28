Tapedeck.Backend.InjectManager = {

  init: function() {
    // listen for new pages to inject our content into
    chrome.tabs.onUpdated.addListener(this.updatedListener);

    chrome.tabs.onSelectionChanged.addListener(this.selectionListener);
  },

  /* changeInfo has status and optionally url.
   * status is loading at start of page load, no url will be set.
   * status is complete at end of page load, url will be set if not reload.
   */
  updatedListener: function(tabID, changeInfo, tab) {
    var injectMgr = Tapedeck.Backend.InjectManager;

    // If it's a blocked url or the test url abort now
    if (injectMgr.isURLBlocked(tab.url) ||
        injectMgr.isTest(tab.url)) {
        return;
    }

    // the tab is loading a new page, clear any previous executions we had logged
    if (changeInfo.status == "loading") {
      injectMgr.executedMap[tabID] = [];
    }

    // Handle status == 'complete' updates
    if (typeof(changeInfo.status) != "undefined" &&
        changeInfo.status == "complete") {

      // Load is complete.  Number 1, inject!
      injectMgr.injectInto(tabID);

      // Handle any postInject scripts if there are any
      var postScripts = injectMgr.postInjectMap[tabID];
      if (typeof(postScripts) != "undefined" &&
          postScripts != null &&
          postScripts.length > 0) {
        for (var i = 0; i < postScripts.length; i++) {
          var context = Tapedeck.Backend.Utils.getContext(tab);
          postScripts[i](context);
        }
      }

      // Delay loadcomplete just a bit. It seems to be more consistent.
      setTimeout(function() {
        Tapedeck.Backend.MessageHandler.signalLoadComplete(tab);
      }, 200);
    }
  },

  injectInto: function(tabID) {
    var runAt = "document_start";
    chrome.tabs.insertCSS(tabID, { file: "frontend/tapedeck-inject-all.css",
                                   runAt: runAt });
    chrome.tabs.executeScript(tabID, { file: "vendor/jquery-1.7.js",
                                       runAt: runAt });
    chrome.tabs.executeScript(tabID, { file: "frontend/tapedeck-inject-all.js",
                                       runAt: runAt });
    chrome.tabs.executeScript(tabID, { file: "util/frontend-util.js",
                                       runAt: runAt });
  },

  // Post inject scripts are provided context as their only param
  postInjectMap: { }, // { tabID => [scripts] }
  registerPostInjectScript: function(tabID, script) {
    if (typeof(this.postInjectMap[tabID]) == "undefined") {
      this.postInjectMap[tabID] = [];
    }
    this.postInjectMap[tabID].push(script);
  },

  removePostInjectScript: function(tabID, scriptToRemove) {
    var scripts = this.postInjectMap[tabID];
    if (typeof(scripts) == "undefined" ||
        scripts.length === 0) {
      console.error("No postinject script to remove for " + tabID);
      return;
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i] == scriptToRemove) {
        scripts.splice(i, 1);
        i--;
      }
    }
  },

  clearPostInjectScripts: function(tabID) {
    this.postInjectMap[tabID] = null;
  },

  selectionListener: function(tabID, selectInfo) {
    var injectMgr = Tapedeck.Backend.InjectManager;

    chrome.tabs.get(tabID, function(tab) {
      // make sure it's a tab we like
      if (injectMgr.isURLBlocked(tab.url) ||
          injectMgr.isTest(tab.url)) {
        return;
      }
      Tapedeck.Backend.TemplateManager.renderViewAndPush("Frame", function(rendered) {
        // nothing to do, already pushed
        console.log("Frame pushed on selection change");
      });
    });
  },

  // responseCallback should prepare for response.error to be present in the event of error.
  // prepCode is optional.
  executedMap: { },
  currInjectors: 0,
  executeScript: function(tab, options, responseCallback, testParams, prepCode) {
    var injectMgr = Tapedeck.Backend.InjectManager;
    if (!injectMgr.isTest(tab.url) && injectMgr.isURLBlocked(tab.url)) {
      return;
    }

    // we rate-limit the number of injectors
    var currTimeout = 1;
    var setupAndInject = function() {

      currTimeout = currTimeout + 100;
      var maxTimeout = injectMgr.currInjectors * 300;
      if (currTimeout < maxTimeout) {
        setTimeout(setupAndInject, currTimeout);
        return;
      }
      injectMgr.currInjectors++;

      // We'll need to wrap the callback so we can make it's
      // request listener self-destruct when it's called.
      // Also, if the inject fails we'll need to clean everything up
      var wrappedCallback = null;
      var cleanupTimer = setTimeout(function() {

        // if the callback never gets called we need to clean it up
        injectMgr.currInjectors = injectMgr.currInjectors - 1;
        if (wrappedCallback != null) {
          chrome.extension.onRequest.removeListener(wrappedCallback);
        }

        var message = { error: "Timedout waiting for injection to return" };
        responseCallback(message);
      }, 2000);

      if (typeof(responseCallback) != "undefined") {
        wrappedCallback = function(response, sender, sendResponse) {
          injectMgr.currInjectors = injectMgr.currInjectors - 1;
          clearTimeout(cleanupTimer);

          responseCallback(response, sender, sendResponse);
          chrome.extension.onRequest.removeListener(arguments.callee);
        };
        chrome.extension.onRequest.addListener(wrappedCallback);
      }

      // Now actually do the injection
      if (!injectMgr.isTest(tab.url)) {
        // this is not the test tab, normal injection

        // if there's some prep work, do it
        if (typeof(prepCode) != "undefined") {
          chrome.tabs.executeScript(tab.id, { code : prepCode });
        }

        if (injectMgr.alreadyExecuted(tab.id, options.file)) {
          // we've already injected this file into this tab, reuse the previous injection;
          var request = Tapedeck.Backend.Utils.newRequest({
            action: "executeScriptAgain",
            script: options.file,
            params: { cassetteName: Tapedeck.Backend.CassetteManager.currentCassette.get("name") }
          });
          chrome.tabs.sendRequest(tab.id, request);
        }
        else {
          // we haven't injected this file yet, go for it.
          chrome.tabs.executeScript(tab.id, options);

          if (typeof(injectMgr.executedMap[tab.id]) == "undefined") {
            injectMgr.executedMap[tab.id] = [options.file];
          }
          else {
            injectMgr.executedMap[tab.id].push(options.file);
          }
        }
      }
      else {
        // If it's the test tab, fake the injection
        var request = Tapedeck.Backend.Utils.newRequest({
          action: "executeScriptInTest",
          script: options.file
        });
        if (typeof(options.params) != "undefined") {
          /* Special means of sending params to start() for test setup */
          request.params = testParams;
        }

        Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
      }
    };
    setupAndInject();
  },

  alreadyExecuted: function(tabID, file) {
    var injectMgr = Tapedeck.Backend.InjectManager;

    if (typeof(injectMgr.executedMap[tabID]) != "undefined") {
      for(var i = 0; i < injectMgr.executedMap[tabID].length; i++) {
        if (injectMgr.executedMap[tabID][i] == file) {
          return true;
        }
      }
    }
    return false;
  },

  isTest: function(url) {
    var match = url.match(/chrome-extension.*SpecRunner.html/);
    return (match != null);
  },


  alwaysBlocked: ["chrome://", "chrome-extension://", "chrome-devtools://"],
  isURLBlocked: function(url) {
    var blockList = Tapedeck.Backend.InjectManager.alwaysBlocked;
    blockList = blockList.concat(Tapedeck.Backend.Bank.getBlockList());
    for (var i = 0; i < blockList.length; i++) {
      var pattern = blockList[i];
      if (url.match(pattern) != null) {
        // url is blocked
        return true;
      }
    }
    return false;
  }
};
