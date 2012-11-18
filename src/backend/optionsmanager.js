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

    options = optionMgr.flatten("", options);

    var bankOptions = Tapedeck.Backend.Bank.getSavedOptionsForConfOptions(options);

    // bankOptions should override the flattened conf options
    _.extend(options, bankOptions);

    //and save them back
    Tapedeck.Backend.Bank.saveOptions(options);

    // TODO enact the options
  },

  getOptions: function(callback) {
    var optionMgr = Tapedeck.Backend.OptionsManager;

    Tapedeck.Backend.Bank.getSavedOptions(function(flatOptions) {
      options = optionMgr.unflatten(flatOptions);
      console.log("Got options -- " + JSON.stringify(options));
      callback(options);
    });

  },

  unflatten: function(object) {
    var toReturn = {};

    for (var key in object) {
      var split = key.replace("-key", "").split('-'); // remove '-key' from the end and split

      if (split.length == 1) {
        // top-level key
        var asNum = parseInt(object[key]);
        if (!isNaN(asNum)) {
          toReturn[split[0]] = asNum;
        }
        else {
          toReturn[split[0]] = object[key];
        }
      }

      var drillDown = function(aObject, aKeys, aIndex) {
        var currObject = aObject;
        for (var i=0; i < aIndex; i++) {
          currObject = currObject[aKeys[i]];
        }
        return currObject;
      };

      for (var i=0; i < split.length; i++) {
        var piece = split[i];
        var onObject = drillDown(toReturn, split, i);

        if (i != split.length - 1) {
          // not a leaf, an object
          if(typeof(onObject[piece]) == "undefined") {
            onObject[piece] = {};
          }
        }
        else {
          var asNum = parseInt(object[key]);
          if (!isNaN(asNum)) {
            onObject[split[i]] = asNum;
          }
          else {
            onObject[split[i]] = object[key];
          }
        }
      }
    }
    return toReturn;
  },

  flatten: function(key, object) {
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
      var subOptions = Tapedeck.Backend.OptionsManager.flatten(hrKey, value);

      for (var subKey in subOptions) {
        var concatKey = hrKey + "-" + subKey;
        concatKey = concatKey.replace(" ", "_");
        toReturn[concatKey] = subOptions[subKey];;
      }
    }
    return toReturn;
  },

  show: function(el, proxyEvents) {
    // get master conf defaults
    // get saved options

        // will establish local CSS override that templateManager will check for
        // will establish local tempalte override checked for at lines 407 and 408 of templateManager
        // will force debug cassettified cassettes into cassette manager
        // includes any local cassettes in the bank's getCassettes return

        // all available logs are specified in master conf?
  },

}