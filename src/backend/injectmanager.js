Tapedeck.Backend.InjectManager = {

  init: function() {
    // listen for new pages to inject our content into
    chrome.tabs.onUpdated.addListener(this.updatedListener);

    // listen for remove so that we can remove the tab from expectedToLoad
    chrome.tabs.onRemoved.addListener(this.removedListener);

    chrome.tabs.onSelectionChanged.addListener(this.selectionListener);
  },

  expectedToLoad : { },
  updatedListener: function(tabID, changeInfo, tab) {
    var injectMgr = Tapedeck.Backend.InjectManager;

    // If it's a blocked url or the test url abort now
    if (injectMgr.isURLBlocked(tab.url) ||
        injectMgr.isTest(tab.url)) {
        return;
    }
    
    if (typeof(changeInfo.url) != "undefined") {
      // url was just set, associate the tabID to the url in our
      // expectations
      injectMgr.expectedToLoad[tabID] = changeInfo.url;
    }

    // It's possible that changeInfo.url is undefined, but we still
    // need to inject (happens for refresh).  Hence the check here to
    // see if it was loaded previously and inject if so.
    if (typeof(injectMgr.expectedToLoad[tabID]) != "undefined") {
      
      // Everything looks good.  Number 1, inject!
      injectMgr.injectInto(tabID);
    }

    // Handle status == 'complete' updates
    if (typeof(changeInfo.status) != "undefined" &&
        changeInfo.status == "complete") {

      // make sure that we expected it
      var url = injectMgr.expectedToLoad[tabID];
      
      if (typeof(url) == "undefined" || url == null) {
        console.log("Got a load complete event for unknown tabID: '" +
                    tab.url + "'");
        return;
      }
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

  removedListener: function(tabID, removeInfo) {
    Tapedeck.Backend.InjectManager.expectedToLoad[tabID] = null;
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
      var rendered = Tapedeck.Backend.TemplateManager
                                     .renderView("Frame",
                                                 { tabID: tabID });

      var viewString = $('<div>').append($(rendered))
                                 .remove()
                                 .html();

      Tapedeck.Backend.MessageHandler.pushView("tapedeck-content",
                                               viewString,
                                               tab);
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
