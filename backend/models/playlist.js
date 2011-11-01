Tapedeck.Backend.Collections.Playlist =
  Tapedeck.Backend.Collections.TrackList.extend({


  initialize: function(options) {
    if (!("name" in options)) {
      options.name = "Unnamed Playlist";
    }
  }
});
