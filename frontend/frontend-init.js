if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
  Tapedeck.Frontend = { };
}
                          
Tapedeck.Frontend.init = function() {
  Tapedeck.Frontend.Messenger.init();

  var callback = function(response) {
    Tapedeck.Frontend.Frame.replaceView("tapedeck-content", response.view);
    Tapedeck.Frontend.Frame.init();
  };

  Tapedeck.Frontend
          .Messenger
          .getView("Frame", { }, null, callback);                          

};

