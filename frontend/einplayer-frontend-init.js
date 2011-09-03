if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}
                          
Einplayer.Frontend.init = function() {
  
  // Messenger init must handshake with backend asynch
  Einplayer.Frontend.Messenger.init(function() {
    var callback = function(response) {
      $("#app").replaceWith(response.view);
    };
    Einplayer.Frontend
             .Messenger
             .getView("Player", { }, null, callback);                          
  });
};

