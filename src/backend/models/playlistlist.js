Tapedeck.Backend.Collections.PlaylistList = Backbone.Collection.extend({
  model: Tapedeck.Backend.Collections.Playlist,

  init: function(callback) {
    var bank = Tapedeck.Backend.Bank;

    this.bind("add", Tapedeck.Backend.Collections.PlaylistList.prototype.addPlaylist);
    this.bind("remove", Tapedeck.Backend.Collections.PlaylistList.prototype.removePlaylist);

    bank.findKeys("^" + bank.playlistPrefix + ".*", function(playlistKeys) {
      var expectedKeys = playlistKeys.length;
      if (expectedKeys === 0) {
        callback();
      }

      var countdown = function(playlist) {
        expectedKeys = expectedKeys - 1;

        if (expectedKeys === 0) {
          callback();
        }
      };

      for (var i = 0; i < playlistKeys.length; i++) {
        var key = playlistKeys[i];
        bank.recoverSavedTrackList(key, countdown);
      }
    });
  },

  addPlaylist: function(playlist) {
    Tapedeck.Backend.TemplateManager.renderViewAndPush("PlaylistList");
  },

  removePlaylist: function(playlist) { // TODO fix me, push clearing down a level
    var bank = Tapedeck.Backend.Bank;

    playlist.destroy();
    Tapedeck.Backend.TemplateManager.renderViewAndPush("PlaylistList");
  }
});
