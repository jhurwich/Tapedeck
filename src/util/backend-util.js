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
    if (typeof(tab) == "undefined") {
      // get context of background page
      context.tab = "background";
    }
    else {
      // context in specified tab
      context.tab = tab;
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
    }

    var closeTagRegex = function(tag) {
      return new RegExp("<\/" + tag + "[^<>]*>", "gi");
    }

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
      while ((targetMatch = targetRegex.exec(targetTags[i])) != null) {
        var key = targetMatch[1];
        var value = targetMatch[2];
        map[key] = value;
      }
    }
    return map;
  },

  domToString: function(dom) {
    return $('div').append($(dom)).remove().html();
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
