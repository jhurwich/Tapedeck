if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}
if (typeof(Einplayer.Frontend.Frame) != "undefined") {
  return;
}

Einplayer.Frontend.Frame = {

  clickTimer: null,
  clickID   : null,
  rowClick: function(e) {
    var row = $(e.target).closest(".row");
    
    // make sure this isn't actually a double click
    if (Einplayer.Frontend.Frame.clickTimer != null) {
          
      clearTimeout(Einplayer.Frontend.Frame.clickTimer);
      Einplayer.Frontend.Frame.clickTimer = null;
                  
      // make sure it's a double click on the same element
      if ($(row).attr("index") == Einplayer.Frontend.Frame.clickID) {
        Einplayer.Frontend.Frame.clicked = null;

        // Find out and call the correct double click function
        var dblClickFnName = $(row).closest("[rowdblclick]")
                                   .attr("rowdblclick");
        Einplayer.Frontend.Frame[dblClickFnName](row);
        return;
      }
    }

    Einplayer.Frontend.Frame.clickID = $(row).attr("index");
    Einplayer.Frontend.Frame.clickTimer = setTimeout(function() {
      
      Einplayer.Frontend.Frame.clickTimer = null;
      
      if (!$(row).hasClass("selected")) {
        $(row).addClass("selected");
      }
      else {
        $(row).removeClass("selected");
      }
    }, 200);
  },

  browseDblClick: function(row) {
    var trackID = $(row).attr("trackID");
    Einplayer.Frontend.Messenger.queueTrack(trackID);
  },

  queueDblClick: function(row) {
    var trackID = $(row).attr("trackID");
    Einplayer.Frontend.Messenger.playTrack(trackID);
  },
  
};
