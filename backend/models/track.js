Einplayer.Backend.Models.Track = Backbone.Model.extend({

  initialize: function(options) {

    if ($.isEmptyObject(options.attributes) ||
        !("einID" in options.attributes) ) {
      this.set({ einID:  _.uniqueId("ein-track")});
    }
  },

});
