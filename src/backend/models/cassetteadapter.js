Tapedeck.Backend.Models.CassetteAdapter = Tapedeck.Backend.Models.Cassette.extend({


  // The CassetteAdapter should be initialized with the report for the Cassette
  // this adapter should emulate. The report's values are copied to this.attributes.
  initialize: function(report) {
    /* The report should include
     *  {
     *    name: "string",
     *    isBrowseable: boolean,
     *    isPageable: boolean,
     *    tdID: "string",
     *    developer: "string",
     *    developerLink: "string"
     *  }
     */

    // If isPageable then this should emulate getPage
    if (this.get("isPageable")) {
      this.getPage = this.adaptedGetPage;
    }

    // If isBrowseable then this should emulate getBrowseList
    if (this.get("isBrowseable")) {
      this.getBrowseList = this.adaptedGetBrowseList;
    }

    // Allow the errorHandler to pipe through to the real cassette
    if (typeof(report.errorHandler) != "undefined") {
      this.errorHandler = this.adaptedErrorHandler;
    }
  },

  adaptedGetPage: function(pageNum, context, callback, errCallback, finalCallback) {
    var params = { page: pageNum, context: context };
    this.proxyMethod("getPage", params, callback, errCallback, finalCallback);
  },

  adaptedGetBrowseList: function(context, callback, errCallback, finalCallback) {
    var params = { context: context };
    this.proxyMethod("getBrowseList", params, callback, errCallback, finalCallback);
  },

  adaptedErrorHandler: function(params, successCallback, errCallback) {
    this.proxyMethod("errorHandler", params, successCallback, errCallback);
  },

  // the adapter prevents requests from being repeated to the sandbox, all callbacks get the first's result
  requestMap: {},
  proxyMethod: function(methodName, params, successCallback, errCallback, finalCallback) {
    // mapID is the page concatted to the feed, if it exists
    var mapID = 0;
    if (typeof(params.page) != "undefined") {
      mapID = params.page;
    }
    if (Tapedeck.Backend.CassetteManager.currFeed != null) {
      mapID = "" + mapID + Tapedeck.Backend.CassetteManager.currFeed;
    }

    // initialize the map for this method if it doesn't exist
    if (!(methodName in this.requestMap)) {
      this.requestMap[methodName] = { };
    }

    var callbackMap = this.requestMap[methodName];

    var callbackObject = { successCallback : successCallback,
                           errCallback     : errCallback };
    if (typeof(finalCallback) != "undefined") {
      callbackObject.finalCallback = finalCallback;
    }

    if (typeof(callbackMap[mapID]) != "undefined") {
      // request already made, allow that to complete and return based on it
      callbackMap[mapID].push(callbackObject);
      console.error("[CassetteAdapter] Proxy method has not returned yet, terminating redundant call.");
      return;
    }
    else {
      // new request, queue the callbacks and continue to make it
      callbackMap[mapID] = [callbackObject];
    }

    var message = Tapedeck.Backend.Utils.newRequest({
      action: methodName,
      params: params,
      tdID: this.get("tdID")
    });
    Tapedeck.Backend.MessageHandler.messageSandbox(message, function(response) {
      if (typeof(response.error) != "undefined" && response.error) {
        // there was some error
        for (var i = 0; i < callbackMap[mapID].length; i++) {
          callbackMap[mapID][i].errCallback(response.error);
        }
        delete callbackMap[mapID];
      }
      else if (typeof(response.final) != "undefined" && response.final) {
        // final callback for this interaction
        for (var i = 0; i < callbackMap[mapID].length; i++) {
          if (typeof(callbackMap[mapID][i].finalCallback) != "undefined") {
            callbackMap[mapID][i].finalCallback(response);
          }
        }
        delete callbackMap[mapID];
      } else {
        // success
        for (var i = 0; i < callbackMap[mapID].length; i++) {
          callbackMap[mapID][i].successCallback(response);
        }

        // some methods don't have a finalCallback, in which case we're done
        if (typeof(finalCallback) == "undefined") {
          delete callbackMap[mapID];
        }
      }
    });
  }

});
