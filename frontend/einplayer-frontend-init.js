if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}
                          
Einplayer.Frontend.init = function() {
  Einplayer.Frontend.Messenger.init();

  var callback = function(response) {
    Einplayer.Frontend.Frame.replaceView("einplayer-content", response.view);
    Einplayer.Frontend.Frame.init();
  };

  Einplayer.Frontend
           .Messenger
           .getView("Frame", { }, null, callback);                          

};

