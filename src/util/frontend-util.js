// detect if we should attach to Tapedeck.Frontend or TapedeckInjected
var onObject = null;
var hrOn = "";
if (typeof(TapedeckInjected) != "undefined") {
  onObject = TapedeckInjected;
  hrOn = "injected";
}
else {
  if (typeof Tapedeck == "undefined") {
    var Tapedeck = { };
  }
  if (typeof(Tapedeck.Frontend) == "undefined") {
    Tapedeck.Frontend = { };
  }
  onObject = Tapedeck.Frontend;
  hrOn = "frontend";
}

if (onObject != null &&
    (typeof(onObject.Utils) == "undefined")) {

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
        console.log("<Unknown LogLevel> " + component + " (" + currentTime.getTime() + ") - " + str);
      }

      // compare set logLevel vs level
      if (logLevel >= level) {
        console.log(component + " (" + currentTime.getTime() + ") - " + str);
      }
    },
  }; // end onObject.Utils
}

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
  }
};