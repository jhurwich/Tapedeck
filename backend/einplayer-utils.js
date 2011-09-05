if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Backend = { };
}
Einplayer.Backend.Utils = {

  getContext: function(callback) {
    var context = {};
    var isContextComplete = function(contextCheck) {
      if (!("document" in contextCheck)) {
        return false;
      }
      return true;
    };

    Einplayer.Backend.MessageHandler.getDocument(function(document) {
      context.document = document;
      if (isContextComplete(context)) {
        callback(context);
      }
    });
  }
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
