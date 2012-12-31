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

    replaceView: function(viewStr, proxyEvents) {
      var view = $(viewStr);
      var targetID = $(view).first().attr("id");

      $("#" + targetID).replaceWith(view);
      if (typeof(proxyEvents) != 'undefined' && !jQuery.isEmptyObject(proxyEvents)) {
        onObject.Utils.attachEvents(targetID, proxyEvents);
      }
      else {
        console.error("Replacing view '" + targetID + "' without attaching events");
      }
    },

    attachEvents: function(id, events) {
      for (var key in events) {
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

        var match = key.match(/^(\S+)\s*(.*)$/);
        var eventName = match[1];
        var selector = match[2];

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