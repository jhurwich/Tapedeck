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
  },

  adaptedGetPage: function(pageNum, context, callback, errCallback, finalCallback) {
    var params = { page: pageNum, context: context };
    this.proxyMethod("getPage", params, callback, errCallback, finalCallback);
  },

  adaptedGetBrowseList: function(context, callback, errCallback, finalCallback) {
    var params = { context: context };
    this.proxyMethod("getBrowseList", params, callback, errCallback, finalCallback);
  },

  proxyMethod: function(methodName, params, successCallback, errCallback, finalCallback) {
    var message = {
      action: methodName,
      params: params,
      tdID: this.get("tdID")
    };
    Tapedeck.Backend.MessageHandler.messageSandbox(message, function(response) {
      if (typeof(response.error) != "undefined" && response.error) {
        // there was some error
        errCallback(response.error);
      }
      else if (typeof(response.final) != "undefined" && response.final) {
        // final callback for this interaction
        finalCallback(response);
      } else {
        // success
        successCallback(response);
      }
    });
  }

});
