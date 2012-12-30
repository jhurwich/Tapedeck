Tapedeck.Backend.OptionsManager = {

  init: function(continueInit) {
    var self = this;
    self.getConf(self.handleConf.curry(continueInit));

  },

  // This expects a callback that itself takes the params (successCallback, conf),
  // successCallback receives no params, is just an indicator.
  // conf should be $.parseJSON(conf)-able
  getConf: function(callback) {
    var confURL = chrome.extension.getURL("util/options.conf");
    $.ajax({
      type: "GET",
      url: confURL,
      dataType: "text",
      success : callback,
      error : function(xhr, status) {
        console.error("Error getting options.conf: " + status);
      }
    });
  },

  handleConf: function(successCallback, conf) {
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

    Tapedeck.Backend.Bank.getSavedOptions(function(bankOptions) {

      // bankOptions should override the flattened conf options
      options = _.extend(options, bankOptions);

      //and save them back
      Tapedeck.Backend.Bank.saveOptions(options);

      optionMgr.enactOptions(optionMgr.unflatten(options), function() {
        successCallback();
      });
    });
  },

  getOptions: function(callback) {
    var optionMgr = Tapedeck.Backend.OptionsManager;

    Tapedeck.Backend.Bank.getSavedOptions(function(flatOptions) {
      var options = optionMgr.unflatten(flatOptions);
      callback(options);
    });
  },

  enactOptions: function(options, callback) {
    var optionMgr = Tapedeck.Backend.OptionsManager;
    var logsDone = false;
    var overridesDone = false;
    var premadesDone = false;
    var tryFinish = function() {
      if (logsDone && overridesDone && premadesDone) {
        callback();
      }
    };

    var handleOverridesAndPremades = function () {
      logsDone = true;

      var overridesFinish = function() {
        overridesDone = true;
        tryFinish();
      };
      var premadesFinish = function() {
        premadesDone = true;
        tryFinish();
      };
      for (var aKey in options) {
        var compareKey = aKey.toLowerCase();
        if (compareKey.indexOf("development") != -1) {
          // this is the local override subobject
          optionMgr.localOverrides(options[aKey], overridesFinish);
        }
        else if (compareKey.indexOf("premade") != -1) {
          // this the premade cassettified cassettes subobject
          optionMgr.premadeCassettes(options[aKey], premadesFinish);
        }
      }
      tryFinish();
    };

    for (var key in options) {
      var compareKey = key.toLowerCase();

      // search for the logs and do those first, so that logging is sensical before initializing other things
      if (compareKey.indexOf("log") != -1) {
        // this is the logs subobject
        optionMgr.setLogs(options[key], handleOverridesAndPremades);
        break;
      }
    }
  },

  setLogs: function(object, callback) {
    Tapedeck.Backend.Utils.setLogs(object);
    Tapedeck.Backend.MessageHandler.setLogs(object, callback);
  },

  localOverrides: function(object, callback) {
    // overrides are stored in the bank so that they're merged with existing sources
    var bank = Tapedeck.Backend.Bank;


    var devTemplatesFilename = "";
    var devCSSFilename = "";
    var devCassettesFilenames = "";

    var templatesAndCSSComplete = false;
    var cassettesComplete = false;
    var checkAndFinish = function() {
      // if we needed to handle files, length > 0, make sure they're complete
      if (((devTemplatesFilename.length === 0 || devCSSFilename.length === 0) || templatesAndCSSComplete) &&
          ((devCassettesFilenames.length === 0) || cassettesComplete)) {
        callback();
      }
    };

    for (var key in object) {
      var compareKey = key.toLowerCase();

      if (compareKey == "skinning") {
        for (var subKey in object[key]) {
          compareKey = subKey.toLowerCase();

          if (compareKey.indexOf("template") != -1) {
            devTemplatesFilename = object[key][subKey];
          }
          else if (compareKey.indexOf("css") != -1) {
            devCSSFilename = object[key][subKey];
          }
        }
      }
      else if (compareKey == "cassettes") {
        for (var subKey in object[key]) {
          compareKey = subKey.toLowerCase();

          if (compareKey.indexOf("cassette") != -1) {
            devCassettesFilenames = object[key][subKey];
          }
        }
      }
    } // end for (var key in object)
    checkAndFinish();

    if (devTemplatesFilename.length > 0 && devCSSFilename.length > 0) {
      bank.setDevTemplatesAndCSS(devTemplatesFilename, devCSSFilename, function() {
        templatesAndCSSComplete = true;
        checkAndFinish();
      });
    }
    if (devCassettesFilenames.length > 0) {
      // param 2 is false to avoid reading in cassettes, that will happen in cassettemanager init
      bank.setDevCassettes(devCassettesFilenames, false, function() {
        cassettesComplete = true;
        checkAndFinish();
      });
    }
  },

  // CassetteManager isn't initialized, just prepare the params and it's init will get these through the bank
  premadeCassettes: function(object, callback) {

    Tapedeck.Backend.Bank.premadeCassettes = [];
    for (var key in object) {
      var pattern = object[key];
      if (typeof(pattern) != "string" || pattern.length === 0) {
        continue;
      }


      // we use url to first slash as the name
      var firstSlash = pattern.indexOf('/');
      var name = pattern.substring(0, firstSlash);

      // except for exception domains
      for (var exceptionDomain in Tapedeck.Backend.CassetteManager.Cassettify.exceptionDomains) {
        if (pattern.indexOf(exceptionDomain) != -1) {
          name = pattern.replace(exceptionDomain, "");
        }
      }

      // get rid of url cruft and forbidden chars for cassette names
      name = name.replace("http://", "");
      name = name.replace("www.", "");
      name = name.replace(".com", "");
      name = name.replace(/[^a-zA-Z0-9\s]/gi, "");

      var param = { pattern: object[key],
                    cassetteName: name };

      Tapedeck.Backend.Bank.premadeCassettes.push(param);
    } // end for (var key in object)
    callback();
  },

  unflatten: function(object) {
    var toReturn = {};

    var drillDown = function(aObject, aKeys, aIndex) {
      var currObject = aObject;
      for (var i=0; i < aIndex; i++) {
        currObject = currObject[aKeys[i]];
      }
      return currObject;
    };

    for (var key in object) {
      var split = key.replace("-key", "").split('-'); // remove '-key' from the end and split

      if (split.length == 1) {
        // top-level key
        var asNum = parseInt(object[key], 10);
        if (!isNaN(asNum)) {
          toReturn[split[0]] = asNum;
        }
        else {
          toReturn[split[0]] = object[key];
        }
      }

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
          var asNum = parseInt(object[key], 10);
          if (!isNaN(asNum)) {
            onObject[split[i]] = asNum;
          }
          else if (typeof(object[key]) == "string") {
            onObject[split[i]] = object[key].replace(/\s/g, "_");
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
      return { key: object.replace(/\s/g, "_") };
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
        concatKey = concatKey.replace(/\s/g, "_");
        toReturn[concatKey] = subOptions[subKey];
      }
    }
    return toReturn;
  }
};