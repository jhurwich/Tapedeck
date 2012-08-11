Tapedeck.Backend.Collections.Playlist =
  Tapedeck.Backend.Collections.SavedTrackList.extend({

  getPrefix: function() {
    return Tapedeck.Backend.Bank.playlistPrefix;
  },

  initialize: function(models, options) {
    Tapedeck.Backend.Collections.SavedTrackList.prototype.initialize.call(this, models, options);

    var found = Tapedeck.Backend.Bank.PlaylistList.get(this.id);
    if (found != null) {
      bank.removePlaylist(found);
    }
    Tapedeck.Backend.Bank.PlaylistList.add(this);
  },

  // override the toJSON so that the id is preserved
  toJSON: function() {
    var json = Backbone.Collection.prototype.toJSON.call(this);

    json['id'] = this.id;
    return json;
  },
});
