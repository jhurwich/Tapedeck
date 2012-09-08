Tapedeck.Backend.Collections.Playlist =
  Tapedeck.Backend.Collections.SavedTrackList.extend({

  getPrefix: function() {
    return Tapedeck.Backend.Bank.playlistPrefix;
  },

  initialize: function(models, options) {
    var bank = Tapedeck.Backend.Bank;
    Tapedeck.Backend.Collections.SavedTrackList.prototype.initialize.call(this, models, options);

    var found = bank.PlaylistList.get(this.id);
    if (found != null) {
      bank.removePlaylist(found);
    }

    // we only support MAX_NUM_SYNC_PLAYLISTS when sync is on to discourage exceeding quota
    if (!bank.isSyncOn() ||
        bank.PlaylistList.length < bank.MAX_NUM_SYNC_PLAYLISTS) {
      bank.PlaylistList.add(this);
    }
    else {
      var message = "Tapedeck only supports " + bank.MAX_NUM_SYNC_PLAYLISTS + " playlists when using cloud storage."
      Tapedeck.Backend.MessageHandler.showModal({
        fields: [{ type: "info",
                   text: message }],
        title: "Cassettify Wizard",
      });
    }
  },

  // override the toJSON so that the id is preserved
  toJSON: function() {
    var json = Backbone.Collection.prototype.toJSON.call(this);

    json['id'] = this.id;
    return json;
  },
});
