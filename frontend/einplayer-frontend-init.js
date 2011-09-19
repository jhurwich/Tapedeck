if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}
                          
Einplayer.Frontend.init = function() {
  Einplayer.Frontend.Messenger.init();

  var callback = function(response) {
    $("#app").replaceWith(response.view);
  };

  Einplayer.Frontend
           .Messenger
           .getView("Player", { }, null, callback);                          

};

