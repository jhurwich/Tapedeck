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

  // text is the text to be altered
  // tags is an array of tagNames
  // removeContentToo is a bool indicating if everything between tags should be removed as well
  removeTags: function(text, tags, removeContentToo) {
    var openTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*>");
    }

    var closeTagRegex = function(tag) {
      return new RegExp("<\/" + tag + "[^<>]*>", "i");
    }

    var selfClosedTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*\/>", "i");
    }

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
