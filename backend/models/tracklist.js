Einplayer.Backend.Collections.TrackList = Backbone.Collection.extend({
  model: Einplayer.Backend.Models.Track,

  serialize: function() {
    return JSON.stringify(this.toJSON());
  },

  TEMP_PROPS: [
    "listened",
    "playing"
  ],
  removeTempProperties: function() {
    var tempProps = Einplayer.Backend.Collections.TrackList.prototype.TEMP_PROPS;
    this.each(function(track) {
      for (var i = 0; i < tempProps.length; i++) {
        track.unset(tempProps[i], { silent: true });
      }
    });
  },

  makePlaylist: function(playlistID) {
    var playlist = new Einplayer.Backend.Collections.Playlist(this.models);
    playlist.removeTempProperties();
    playlist.id = playlistID;
    return playlist;
  },
});
