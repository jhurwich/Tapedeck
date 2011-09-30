if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Backend = { };
}
Einplayer.Backend.Utils = {

  CONTEXT_ATTRIBUTES: [
    "document",
    "tab"
  ],

  getContext: function(callback, tab) {
    var context = { tab: tab };
    var isContextComplete = function(contextCheck) {
      var attrs =  Einplayer.Backend.Utils.CONTEXT_ATTRIBUTES;
      for (var i = 0; i < attrs.length; i++) {
        if (!(attrs[i] in contextCheck)) {
          return false;
        }
      }
      return true;
    };
    
    Einplayer.Backend.MessageHandler.getDocument(function(document) {
      context.document = document;
      if (isContextComplete(context)) {
        callback(context);
      }
    }, tab);
  },

  // Adapted from Backbone.js's native method of attaching view events.
  // Necessary b/c that code normally runs where the View is constructed, 
  // which would be the backend so events wouldn't be attached.
  proxyEvents: function(view) {
    var events = view.proxyEvents;
    if ($.isEmptyObject(events)) {
      return;
    }
    
    var cid = view.cid;
    var el = view.el;
    
    var script = document.createElement('pre');
    $(script).css("display", "none");
    $(script).addClass("delegate-events");
    scriptStr = "$('.einplayer-content').unbind('.delegateEvents" + cid + "');\n";
    
    for (var key in events) {
      scriptStr += "var method = Einplayer.Frontend.Frame['" + events[key] + "'];\n"
      scriptStr += "if (!method) console.log('Event " + events[key] + " does not exist');\n";

      var match = key.match(/^(\S+)\s*(.*)$/);
      var eventName = match[1], selector = match[2];
      eventName += ".delegateEvents" + cid;

      scriptStr += "if ('" + selector + "' === '') {\n";
      scriptStr +=   "$('.einplayer-content').first()" +
                                            ".bind('" +
                                                   eventName +
                                                   "', method);\n"
      scriptStr += "} else {\n"
      scriptStr +=    "$('.einplayer-content').first()" +
                                             ".delegate('" +
                                                        selector + "', '" +
                                                        eventName + "', " +
                                                        "method);\n";
      scriptStr += "}\n ";
    }
    $(el).append($(script).html(scriptStr));
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
