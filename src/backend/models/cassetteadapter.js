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

  adaptedGetPage: function(pageNum, context, callback, errCallback) {
    var params = { page: pageNum, context: context };
    this.proxyMethod("getPage", params, callback, errCallback);
  },

  adaptedGetBrowseList: function(context, callback, errCallback) {
    var params = { context: context };
    this.proxyMethod("getBrowseList", params, callback, errCallback);
  },

  proxyMethod: function(methodName, params, successCallback, errCallback) {
    var message = {
      action: methodName,
      params: params,
      tdID: this.get("tdID")
    };
    Tapedeck.Backend.MessageHandler.messageSandbox(message, function(response) {
      if (typeof(response.error) == "undefined" || !response.error) {
        // success
        successCallback(response.tracks);
      }
      else {
        // there was some error
        errCallback(response.error);
      }
    });
  },

});
