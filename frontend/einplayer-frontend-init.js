if (typeof Einplayer == "undefined") {
  Einplayer = {};
}
                          
Einplayer.Frontend = {

  init: function() {
    var callback = function(response) {
      $("#app").replaceWith(response.view);
    };
    Einplayer.Frontend
             .Requester
             .getView("Player", { }, null, callback);
                               
  },
}

