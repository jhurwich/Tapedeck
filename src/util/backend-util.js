if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
  Tapedeck.Backend = { };
}
Tapedeck.Backend.Utils = {

  CONTEXT_ATTRIBUTES: [
    "tab"
  ],

  getContext: function(tab) {
    var context = { };
    var cMgr = Tapedeck.Backend.CassetteManager;
    if (typeof(tab) == "undefined") {
      // get context of background page
      context.tab = "background";
    }
    else {
      // context in specified tab
      context.tab = tab;
    }

    // feed is an optional value in the context
    if (typeof(cMgr.currFeed) != "undefined" && cMgr.currFeed != null) {
      context.feed = cMgr.currFeed;
    }

    var isContextComplete = function(contextCheck) {
      var attrs =  Tapedeck.Backend.Utils.CONTEXT_ATTRIBUTES;
      for (var i = 0; i < attrs.length; i++) {
        if (!(attrs[i] in contextCheck)) {
          return false;
        }
      }
      return true;
    };

    if (isContextComplete(context)) {
      return context;
    }
    else {
      console.error("Error: attempted to return incomplete context");
      return null;
    }
  },

  // callback receives the file contents and url as params.
  // Contents will be null if there's an error.
  getFileContents: function(path, callback) {
    var url = chrome.extension.getURL(path);
    $.ajax({
      type: "GET",
      url: url,
      dataType: "text",
      success : function(contents) {
        callback(contents, url);
      },
      error : function(xhr, status) {
        console.error("Error getting " + url + ": " + status);
        callback(null, url);
      }
    });
  },

    // convenience function for turning a el's id into a templateName
  idToTemplateName: function(id) {
    var templateName = id;

    var dashIndex = -1;
    while((dashIndex = templateName.indexOf('-')) != -1) {
      templateName = templateName.substring(0, dashIndex) +
                     templateName.charAt(dashIndex + 1).toUpperCase() +
                     templateName.substring(dashIndex + 2);
    }
    return templateName.charAt(0).toUpperCase() + templateName.substring(1);
  },

  // returns an array of strings representing the contents of all tags of tagName type
  getTagBodies: function(text, tagName) {
    var bodies = [];

    var openTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*>", "gi");
    };

    var closeTagRegex = function(tag) {
      return new RegExp("<\/" + tag + "[^<>]*>", "gi");
    };

    var openRegex = openTagRegex(tagName);
    var openMatch = null;
    var closeRegex = closeTagRegex(tagName);
    var closeMatch = null;
    while ((openMatch = openRegex.exec(text)) != null) {
      if ((closeMatch = closeRegex.exec(text)) != null &&
          openMatch.index < closeMatch.index ) {

        var body = text.substring(openMatch.index + openMatch[0].length,
                                  closeMatch.index);
        bodies.push(body);
      }
      else {
        // extraction failed here
        console.error("body extraction failed for '" + tagName + "'");
      }

    }
    return bodies;
  },

  extractTagAsObject: function(text, tagName) {
    var map = {};

    var targetTags = Tapedeck.Backend.Utils.getTagBodies(text, tagName);
    var targetRegex = /"([^"]+)["]\s*?:\s*?["]([^"]+)["]/g;

    for (var i = 0; i < targetTags.length; i ++) {
      var targetMatch = targetRegex.exec(targetTags[i]);
      while (targetMatch != null) {
        var key = targetMatch[1];
        var value = targetMatch[2];
        map[key] = value;
        targetMatch = targetRegex.exec(targetTags[i]);
      }
    }
    return map;
  },

  // text is the text to be altered
  // tags is an array of tagNames
  // removeContentToo is a bool indicating if everything between tags should be removed as well
  removeTags: function(text, tags, removeContentToo) {
    var openTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*>");
    };

    var closeTagRegex = function(tag) {
      return new RegExp("<\/" + tag + "[^<>]*>", "i");
    };

    var selfClosedTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*\/>", "i");
    };

    if (removeContentToo) {
      // remove the tags and their contents
      for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];

        // we don't want the tags as blocks or as self closed tags
        var selfCloseMatch = null;
        while ((selfCloseMatch = text.match(selfClosedTagRegex(tag))) != null) {
          text = text.replace(selfCloseMatch[0], "");
        }

        var openPos = -1;
        var closeMatch = null;
        while ((openPos = text.search(openTagRegex(tag))) != -1) {
          if ((closeMatch = text.match(closeTagRegex(tag))) != null) {
            var closeLen = closeMatch[0].length;
            var toRemove = text.substring(openPos, closeMatch.index + closeLen);
            text = text.replace(toRemove, "");
          }
          else {
            // couldn't find a close tag, just remove the open tag
            console.error("no close tag for open tag '" + tag + "'");
            text = text.replace(text.match(openTagRegex(tag))[0], "");
          }

        }
      }
    }
    else {
      // we only want to remove the tags themselves
      for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];

        var match = null;
        while ((match = text.match(openTagRegex(tag))) != null) {
          text = text.replace(match[0], "");
        }
        while ((match = text.match(closeTagRegex(tag))) != null) {
          text = text.replace(match[0], "");
        }
        while ((match = text.match(selfClosedTagRegex(tag))) != null) {
          text = text.replace(match[0], "");
        }
      }
    }
    return text;
  },

  isSpeaking: false,
  speekTrack: function(aTrack, aCallback) {
    var utils = Tapedeck.Backend.Utils;
    var bank = Tapedeck.Backend.Bank;
    if (utils.isSpeaking) {
      return;
    }

    var makePhrase = function(track) {
      var phrase = track.get("trackName");
      if (typeof(track.get("artistName")) != "undefined") {
        phrase = phrase + " by " + track.get("artistName");
      }
      phrase = phrase.replace(/feat\.*/ig, "featuring");
      return phrase;
    };
    var utterance = makePhrase(aTrack);

    utils.isSpeaking = true;

    var numWords = utterance.split(" ").length;
    var wordCount = 0;
    var hasCallbacked = false;
    var speechEventHandler = function(e) {
      if (e.type == 'word') {
        wordCount++;
        if (!hasCallbacked &&
            wordCount == numWords - 2) { // start song one word early
          hasCallbacked = true;
          aCallback();
        }
      }
      else if (e.type == 'end' || e.type == 'interrupted' || e.type == 'cancelled' || e.type == 'error') {
        utils.isSpeaking = false;
        aCallback();
      }
    };

    var rate = localStorage['rate'] || 0.80;
    var pitch = localStorage['pitch'] || 1.0;
    var volume = localStorage['volume'] || 1.0;
    var voice = bank.getSpeech();
    var voiceParams = { voiceName: voice,
                        rate: parseFloat(rate),
                        pitch: parseFloat(pitch),
                        volume: parseFloat(volume),
                        onEvent: speechEventHandler
                      };
    chrome.tts.speak(utterance, voiceParams);
  },

  domToString: function(dom) {
    return $('div').append($(dom)).remove().html();
  },

  /* This is a proxy for $.ajax that properly pipes from the Sandbox to the Backend.
   * params.success and .error will receive:
   *   (Object data, String textStatus, [jqXHR on Backend | jqXHR.getAllResponseHeaders() in Sandbox])
   */
  ajax : function(params) {

     // Tapedeck.ajax cannot be performed from the Sandbox, relay to background
    if (typeof(params.isSandbox) != "undefined" && params.isSandbox) {

      Tapedeck.Sandbox.log("Sandbox is calling out for AJAX: " + JSON.stringify(params),
                           Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

      delete params['isSandbox'];

      var successFn = params.success;
      var errorFn = params.error;
      delete params['success'];
      delete params['error'];

      var handleAjax = function(response) {
        if (typeof(response.error) == "undefined") {
          // success callback
          successFn(response.data, response.textStatus, response.headers);
        }
        else {
          // an error happened
          errorFn(response.data, response.textStatus, response.headers);
        }
      };

      var message = Tapedeck.Sandbox.Utils.newRequest({
        action : "ajax",
        params : params
      }, handleAjax);
      // callback to params.success or params.error
      Tapedeck.Sandbox.sendMessage(message);
    }
    else {
      Tapedeck.Backend.MessageHandler.log("Performing ajax to '" + params.url + "'");
      $.ajax(params);
    }
  },

  pendingCallbacks: {},
  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";


    var rID = new Date().getTime();
    while (rID in Tapedeck.Backend.Utils.pendingCallbacks) {
      rID = rID + 1;
    }
    request.requestID = rID;

    if (typeof(callback) != "undefined" &&
        callback != null) {
      Tapedeck.Backend.Utils.pendingCallbacks[rID] = callback;
    }
    else {
      Tapedeck.Backend.Utils.pendingCallbacks[rID] = false;
    }

    return request;
  },

  newResponse: function(request, object) {
    var response = (object ? object : { });
    response.type = "response";

    if ("requestID" in request) {
      response.callbackID = request.requestID;
    }
    else {
      console.error("Can't make a response without a callbackID - now requestID in the requesting: " + request.action);
      if ("callbackID" in request) {
        console.error("callbackID: " + request.callbackID);
      }
    }
    return response;
  },

  DEBUG_LEVELS: {
    ALL: 2,
    BASIC: 1,
    NONE: 0
  },
  logLevels: { },
  setLogs: function(logs) {
    Tapedeck.Backend.Utils.logLevels = logs;
  },
  log: function(component, str, level, forcedLevels) {
    if (typeof(level) =="undefined" ) {
      level = 1;
    }
    var self = Tapedeck.Backend.Utils;
    var currentTime = new Date();

    var logLevel = ((typeof(self.logLevels) != "undefined" && typeof(self.logLevels.Backend) != "undefined") ?
                    self.logLevels.Backend[component] :
                    null);

    // Scripts are exceptions that could be backend or frontend, see if this is a script
    if ((typeof(self.logLevels) != "undefined" && typeof(self.logLevels.Scripts) != "undefined") &&
        logLevel == null) {
      logLevel = (typeof(self.logLevels.Scripts[component]) != "undefined") ? self.logLevels.Scripts[component] : null;
    }

    if (logLevel == null || typeof(logLevel) == "undefined") {
      console.log("<Unknown LogLevel> " + component + " (" + currentTime.getTime() + ") - " + str); /* ALLOWED */
    }

    // compare set logLevel vs level
    if (logLevel >= level) {
      console.log(component + " (" + currentTime.getTime() + ") - " + str); /* ALLOWED */
    }
  }
};

// ajax is a top-level command for the same call whether on Backend or Sandbox
Tapedeck.ajax = Tapedeck.Backend.Utils.ajax;

// copied wholesale from prototype.js, props to them
Function.prototype.curry = function() {
	var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

	if (!arguments.length) return this;
	var __method = this, args = slice.call(arguments, 0);
	return function() {
		var a = merge(args, arguments);
		return __method.apply(this, a);
	};
};
