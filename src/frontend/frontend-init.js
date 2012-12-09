if (typeof(Tapedeck) == "undefined") {
  var Tapedeck = { };
  Tapedeck.Frontend = { };
}

Tapedeck.Frontend.init = function() {
  Tapedeck.Frontend.Messenger.init();
  Tapedeck.Frontend.Messenger.getLogs(function(response) {
    Tapedeck.Frontend.Utils.setLogs(response.logs);
  });

  var callback = function(response) {
    Tapedeck.Frontend.Frame.replaceView(response.view,
                                        response.proxyEvents);
    Tapedeck.Frontend.Frame.init();
  };

  // Get the Frame, self-populated, from the default package, callback above, and postPopulate it
  Tapedeck.Frontend
          .Messenger
          .getView("Frame", null, null, callback, true);

};

$(document).ready(function() {
  Tapedeck.Frontend.init();
});

