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
      setTimeout(Tapedeck.Backend.MessageHandler.signalLoadComplete(tab),
                 200);
    }
  },

  injectInto: function(tabID) {
    chrome.tabs.insertCSS(tabID, {file: "frontend/tapedeck-inject-all.css"});
    chrome.tabs.executeScript(tabID, {file: "vendor/jquery-1.7.js"});
    chrome.tabs.executeScript(tabID, {file: "frontend/tapedeck-inject-all.js"});
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
        scripts.length == 0) {
      console.log("nothing to remove for " + tabID);
      return;
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i] == scriptToRemove) {
        scripts.splice(i, 1);
        i--;
      };
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
      Tapedeck.Backend.TemplateManager.renderView("Frame", function(rendered) {

        var viewString = $('<div>').append($(rendered.el))
                                   .remove()
                                   .html();

        Tapedeck.Backend.MessageHandler.pushView(viewString,
                                                 rendered.proxyEvents,
                                                 tab);
      });
    });
  },

  executeScript: function(tab, options, responseCallback, testParams) {
    var injectMgr = Tapedeck.Backend.InjectManager;
    if (injectMgr.isURLBlocked(tab.url)) {
      return;
    }

    // We'll need to wrap the callback so we can make it's
    // request listener self-destruct when it's called.
    if (typeof(responseCallback) != "undefined") {

      var wrappedCallback = function(response, sender, sendResponse) {
        responseCallback(response, sender, sendResponse);

        chrome.extension.onRequest.removeListener(arguments.callee);
      }
      chrome.extension.onRequest.addListener(wrappedCallback);
    }

    if (!injectMgr.isTest(tab.url)) {
      chrome.tabs.executeScript(tab.id, options);
    }
    else {
      // If it's the test tab, fake the injection
      var request = Tapedeck.Backend.MessageHandler.newRequest({
        action: "executeScriptInTest",
        script: options.file,
      });
      if (typeof(options.params) != "undefined") {
        /* Special means of sending params to start() for test setup */
        request.params = testParams;
      }

      Tapedeck.Backend.MessageHandler.postMessage(tab.id, request);
    }
  },

  isTest: function(url) {
    var match = url.match(/chrome-extension.*SpecRunner.html$/);
    return (match != null);
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
}
