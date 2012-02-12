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

  // Adapted from Backbone.js's native method of attaching view events.
  // Necessary b/c that code normally runs where the View is constructed, 
  // which would be the backend so events wouldn't be attached.
  proxyEvents: function(view, viewName) {
    var events = view.proxyEvents;
    if ($.isEmptyObject(events)) {
      return;
    }
    
    var el = view.el;
    
    var script = document.createElement('pre');
    $(script).css("display", "none");
    $(script).addClass("delegate-events");
    scriptStr = "$('#tapedeck-content').unbind('.delegateEvents" + viewName + "');\n";
    
    for (var key in events) {
      var methodStr = "Tapedeck.Frontend.Frame";
      var methodPieces = events[key].split(".");
      for(var i = 0; i < methodPieces.length; i++) {
        methodStr += "['" + methodPieces[i] + "']";
      }
      
      scriptStr += "var method = " + methodStr + ";\n"
      scriptStr += "if (!method) console.log('Event " + JSON.stringify(methodPieces) + " does not exist');\n";

      var match = key.match(/^(\S+)\s*(.*)$/);
      var eventName = match[1], selector = match[2];
      
      if (eventName != "onreplace") {
        eventName += ".delegateEvents" + viewName;
  
        scriptStr += "if ('" + selector + "' === '') {\n";
        scriptStr +=   "$('#tapedeck-content').bind('" +
                                                    eventName +
                                                    "', method);\n"
        scriptStr += "} else {\n"
        scriptStr +=    "$('#tapedeck-content').delegate('" +
                                                         selector + "', '" +
                                                         eventName + "', " +
                                                         "method);\n";
        scriptStr += "}\n ";
      }
      else {
        // onreplace actions should happen immediately
        scriptStr += "method();\n"
      }
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
