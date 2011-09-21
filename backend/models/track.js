Einplayer.Backend.Models.Track = Backbone.Model.extend({

  initialize: function(options) {
    this.set({ id:  _.uniqueId("ein-track")});
  },

});
