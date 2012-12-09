if (typeof(Tapedeck) == "undefined") {
  var Tapedeck = { };
}
if (typeof(Tapedeck.Options) == "undefined") {
  Tapedeck.Options = { };
}

Tapedeck.Options.init = function() {
  Tapedeck.Frontend.Messenger.init();

  var callback = function(response) {
    Tapedeck.Options.replaceView(response.view,
                                 response.proxyEvents);
  };

  // Get Options, self-populated, from the default package, callback above, and postPopulate it
  Tapedeck.Frontend
          .Messenger
          .getView("Options", null, null, callback, false);

};

Tapedeck.Options.replaceView = function(viewStr, proxyEvents) {
  var view = $(viewStr);
  var targetID = $(view).first().attr("id");
  $("#" + targetID).replaceWith(view);
  if (typeof(proxyEvents) != 'undefined' && !jQuery.isEmptyObject(proxyEvents)) {
    this.attachEvents(targetID, proxyEvents);
  }
  else {
    console.error("Replacing view '" + targetID + "' without attaching events");
  }
},

$(document).ready(function() {
  Tapedeck.Options.init();
});

