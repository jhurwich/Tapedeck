Tapedeck.Backend.OptionsManager = {

  init: function(continueInit) {
    var self = this;

    var confURL = chrome.extension.getURL("util/options.conf")
    $.ajax({
      type: "GET",
      url: confURL,
      dataType: "text",
      success : self.handleConf.curry(continueInit),
      error : function(xhr, status) {
        console.error("Error getting options.conf: " + status);
      }
    });
  },

  handleConf: function(continueInit, conf) {
    var optionMgr = Tapedeck.Backend.OptionsManager;

    var options = $.parseJSON(conf);

    // remove all _comment's from the conf
    var commentDelete = function(object) {
      $.each(object, function(key, value) {
        if(typeof(value) == "object" ) {
          commentDelete(value);
        }
        else if (value == "_comment") {
          delete object[key];
        }
      });
      delete object["_comment"];
    };
    commentDelete(options);

    options = optionMgr.flatten(options);

    var bankOptions = Tapedeck.Backend.Bank.getSavedOptionsForConfOptions(options);

    // bankOptions should override the flattened conf options
    _.extend(options, bankOptions);

    //and save them back
    Tapedeck.Backend.Bank.saveOptions(options);

    optionMgr.enactOptions(optionMgr.unflatten(options), function() {
      continueInit();
    });

    // TODO enact the options
    // will establish local CSS override that templateManager will check for
    // will establish local tempalte override checked for at lines 407 and 408 of templateManager
    // will force debug cassettified cassettes into cassette manager
    // includes any local cassettes in the bank's getCassettes return

    // all available logs are specified in master conf?
  },

  getOptions: function(callback) {
    var optionMgr = Tapedeck.Backend.OptionsManager;

    Tapedeck.Backend.Bank.getSavedOptions(function(flatOptions) {
      options = optionMgr.unflatten(flatOptions);
      console.log("Got options -- " + JSON.stringify(options));
      callback(options);
    });
  },

  enactOptions: function(options, callback) {
    var optionMgr = Tapedeck.Backend.OptionsManager;
    var logsDone = false;
    var overridesDone = false;
    var preamadesDone = false;
    var tryFinish = function() {
      if (logsDone && overridesDone && premadesDone) {
        callback();
      }
    }

    for (var key in options) {
      var compareKey = key.toLowerCase();

      if (compareKey.indexOf("log") != -1) {
        // this is the logs subobject
        optionMgr.setLogs(options[key], function() {
          logsDone = true;
          tryFinish();
        });
      }
      else if (compareKey.indexOf("src/dev") != -1) {
        // this is the local override subobject
        optionMgr.localOverrides(options[key]);
        overridesDone = true;
        tryFinish();
      }
      else if (compareKey.indexOf("premade") != -1) {
        // this the premade cassettified cassettes subobject
        optionMgr.premadeCassettes(options[key]);
        premadesDone = true;
        tryFinish();
      }
    }
  },

  setLogs: function(object, callback) {
    Tapedeck.Backend.Utils.setLogs(object);
    Tapedeck.Backend.MessageHandler.setLogs(object, callback);

    console.log("setLogs got : " + JSON.stringify(object));
  },

  localOverrides: function(object) {
    console.log("localOverrides got : " + JSON.stringify(object));
  },

  premadeCassettes: function(object) {
    console.log("premadeCassettes got : " + JSON.stringify(object));
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

  flatten: function(object) {
    return this.doFlatten("", object);
  },

  doFlatten: function(key, object) {
    var toReturn = {};

    // non-objects and empty objects are leaves
    if (typeof(object) == "string") {
      return { key: object.replace(" ", "_") }
    }
    if (typeof(object) == "number" ||
        $.isArray(object) ||
        $.isEmptyObject(object)) {
      return { key: object };
    }

    if (typeof(object) != "object") {
      console.error("Object in options.conf is not understood: " + key);
    }

    for (var hrKey in object) {
      var value = object[hrKey];
      var subOptions = Tapedeck.Backend.OptionsManager.doFlatten(hrKey, value);

      for (var subKey in subOptions) {
        var concatKey = hrKey + "-" + subKey;
        concatKey = concatKey.replace(" ", "_");
        toReturn[concatKey] = subOptions[subKey];;
      }
    }
    return toReturn;
  },

}