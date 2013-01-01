if (typeof(Tapedeck) == "undefined") {
  var Tapedeck = { };
  Tapedeck.Frontend = { };
}

Tapedeck.Frontend.init = function() {
  Tapedeck.Frontend.Messenger.init();
  Tapedeck.Frontend.Messenger.getLogs(function(response) {
    Tapedeck.Frontend.Utils.setLogs(response.logs);
  });

  // Get the Frame, but have it push hollow first
  Tapedeck.Frontend
          .Messenger
          .requestUpdate("Frame", true);

};

$(document).ready(function() {
  Tapedeck.Frontend.init();
});

