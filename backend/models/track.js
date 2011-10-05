Einplayer.Backend.Models.Track = Backbone.Model.extend({

  initialize: function(options) {
    if (!("einID" in options)) {
      this.set({ einID:  _.uniqueId("ein-track")});
    }
  },

  /*
  clone: function() {
    // Delegate to the super
    var dolly = Backbone.Model.prototype.clone.call(this);
    dolly.set({id : this.id});
    return dolly;
  },
  */

});
