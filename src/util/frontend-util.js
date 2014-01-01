var attachTo = function(onObject) {
  if (onObject == null || (typeof(onObject.Utils) != "undefined")) {
    return;
  }

  onObject.Utils = {

    DEBUG_LEVELS: {
      ALL: 2,
      BASIC: 1,
      NONE: 0
    },
    logLevels: { },
    setLogs: function(logs) {
      this.logLevels = logs;
    },

    replaceView: function(viewStr, proxyEvents, proxyImages) {
      var view = $(viewStr);
      var targetID = $(view).first().attr("id");

      // remove all whitespace and attrs that are dependent on others like class to see if the views are actually the same
      var existingView = $("#" + targetID)[0].outerHTML.replace(/\s+/g, '');
      var newView = viewStr.replace(/\s+/g, '').replace(/src=['|"].*?['|"]/g, '').replace(/style=['|"].*?['|"]/g, '');

      var dependentAttrs = ["src", "style"];
      for (var i = 0; i < dependentAttrs.length; i++) {
        var attrRegex = new RegExp(dependentAttrs[i] + "=[\'|\"].*?[\'|\"]", "g");
        existingView = existingView.replace(attrRegex, '');
        newView = newView.replace(attrRegex, '');
      }

      // times are special cases where HTML is updated in the frame.js, ignore them
      existingView = existingView.replace(/\d+:\d\d/g, "");
      newView = newView.replace(/\d+:\d\d/g, "");

      // don't place in new views that are the same as existing views
      var areSame = existingView == newView;
      if (areSame) {
        return;
      }

      $("#" + targetID).replaceWith(view);

      // handle proxyEvents
      if (typeof(proxyEvents) != 'undefined' && !jQuery.isEmptyObject(proxyEvents)) {
        onObject.Utils.attachEvents(targetID, proxyEvents);
      }
      else {
        console.error("Replacing view '" + targetID + "' without attaching events");
      }

      // handle proxyImages
      if (typeof(proxyImages) != 'undefined') {
        onObject.Utils.assignImages(targetID, proxyImages);
      }
      else {
        console.error("Replacing view '" + targetID + "' without images provided");
      }
    },

    attachEvents: function(id, events) {
      for (var key in events) {
        var match = key.match(/^(\S+)\s*(.*)$/);
        var eventName = match[1];
        var selector = match[2];

        var methodPieces = events[key].split(".");
        var method = Tapedeck.Frontend.Frame;

        // Utils is used by the Options, we're there if not on the Frame
        if (typeof(method) == "undefined") {
          method = Tapedeck.Options;
        }

        for(var i = 0; i < methodPieces.length; i++) {
          method = method[methodPieces[i]];
        }

        if (methodPieces.length === 0 ||
            typeof(method) == "undefined") {
          console.error("Event " + JSON.stringify(methodPieces) + " does not exist");
        }

        if (eventName.indexOf("onreplace") == -1) {
          if (selector === '') {
            // no selector applies to #frame
            $("#frame").unbind(eventName);
            $("#frame").bind(eventName, method);
          }
          else {
            $(selector).unbind(eventName);
            $(selector).bind(eventName, method);
          }
        }
        else {
          // onreplace actions should happen immediately
          method();
        }
      }
    },

    assignImages: function(targetID, images) {
      var assign = function(index, elem) {
        var url = chrome.extension.getURL("images/" + images[selector]);
        if ($(elem).get(0).tagName == "DIV") {
          url = "url('" + url + "')";
          $(elem).css("background-image", url);
        }
        else if ($(elem).get(0).tagName == "IMG") {
          $(elem).attr("src", url);
        }
      };

      for (var selector in images) {
        if($("#" + targetID).find(selector).length === 0) {
          continue;
        }
        $("#" + targetID).find(selector).each(assign);
      }
    },

    pendingCallbacks: {},
    newRequest: function(object, callback) {
      var request = (object ? object : { });
      request.type = "request";

      // the time should be unique enough to prevent most collisions
      var rID = new Date().getTime();
      while (rID in this.pendingCallbacks) {
        // increment until we're out of collisions
        rID = rID + 1;
      }

      request.requestID = rID;
      if (typeof(callback) != "undefined") {
        this.pendingCallbacks[rID] = callback;
      }
      else {
        this.pendingCallbacks[rID] = false;
      }
      return request;
    },

    newTrackBasedRequest: function(object, callback) {
      var trackXs = object.trackXs;
      object.trackXs = null;
      var request = Tapedeck.Frontend.Utils.newRequest(object, callback);

      if (typeof(trackXs[0]) == "string") {
        // we got the tracks as trackIDs
        request.trackIDs = trackXs;
      }
      else {
        // we got the tracks as crude objects
        request.trackObjs = trackXs;
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

    log: function(component, str, level) {
      if (typeof(level) == "undefined") {
        level = onObject.Utils.DEBUG_LEVELS.BASIC;
      }
      var currentTime = new Date();

      var logLevel = ((typeof(this.logLevels) != "undefined" && typeof(this.logLevels.Frontend) != "undefined") ?
                      this.logLevels.Frontend[component] :
                      null);

      // Scripts are exceptions that could be backend or frontend, see if this is a script
    if ((typeof(this.logLevels) != "undefined" && typeof(this.logLevels.Scripts) != "undefined") &&
        logLevel == null) {
        logLevel = (typeof(this.logLevels.Scripts[component]) != "undefined") ? this.logLevels.Scripts[component] : null;
      }

      if (logLevel == null || typeof(logLevel) == "undefined") {
        console.log("<Unknown LogLevel> " + component + " (" + currentTime.getTime() + ") - " + str); /* ALLOWED */
      }

      // compare set logLevel vs level
      if (logLevel >= level) {
        console.log(component + " (" + currentTime.getTime() + ") - " + str); /* ALLOWED */
      }
    },
  }; // end onObject.Utils
};

// detect if we should attach to Tapedeck.Frontend or TapedeckInjected
var onObject = null;
if (typeof(TapedeckInjected) != "undefined") {
  onObject = TapedeckInjected;
}
else {
  if (typeof Tapedeck == "undefined") {
    var Tapedeck = { };
  }
  if (typeof(Tapedeck.Frontend) == "undefined") {
    Tapedeck.Frontend = { };
  }
  onObject = Tapedeck.Frontend;
}
attachTo(onObject);


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