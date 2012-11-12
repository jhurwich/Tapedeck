Tapedeck.Backend.OptionsManager = {

  init: function() {
    console.log("Initializing Options Manager");
    var self = this;

    var confURL = chrome.extension.getURL("util/options.conf")
    $.ajax({
      type: "GET",
      url: confURL,
      dataType: "text",
      success : self.handleConf,
      error : function(xhr, status) {
        console.error("Error getting options.conf: " + status);
      }
    });
  },

  handleConf: function(conf) {
    var optionMgr = Tapedeck.Backend.OptionsManager;

    var options = $.parseJSON(conf);
    delete options["_comment"]; // only way to do comments in JSON

    options = optionMgr.unpack("", options);

    var bankOptions = Tapedeck.Backend.Bank.getSavedOptions(options);

    // bankOptions should override the unpacked conf options
    _.extend(options, bankOptions);

    optionMgr.renderOptions(options);
  },

  unpack: function(key, object) {
    var toReturn = {};

    // non-objects and empty objects are leaves
    if (typeof(object) == "string") {
      return { key: object.replace(" ", "_") }
    }
    if (typeof(object) == "number" ||
        typeof(object) == "array" ||
        $.isEmptyObject(object)) {
      return { key: object };
    }

    if (typeof(object) != "object") {
      console.error("Object in options.conf is not understood: " + key);
    }

    for (var hrKey in object) {
      var value = object[hrKey];
      var subOptions = Tapedeck.Backend.OptionsManager.unpack(hrKey, value);

      for (var subKey in subOptions) {
        var concatKey = hrKey + "-" + subKey;
        concatKey = concatKey.replace(" ", "_");
        toReturn[concatKey] = subOptions[subKey];;
      }
    }
    return toReturn;
  },

  renderOptions: function(options) {
    var tMgr = Tapedeck.Backend.TemplateManager;

    tMgr.renderViewWithOptions("Options", options, function(response) {
        var el = response.el;
        console.log("got el: " + $(el).html());
        var proxyEvents = response.proxyEvents;
    });;
    // get master conf defaults
    // get saved options

        // will establish local CSS override that templateManager will check for
        // will establish local tempalte override checked for at lines 407 and 408 of templateManager
        // will force debug cassettified cassettes into cassette manager
        // includes any local cassettes in the bank's getCassettes return

        // all available logs are specified in master conf?
  },


  show: function() {

  },

}