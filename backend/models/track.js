Einplayer.Backend.Models.Track = Backbone.Model.extend({

  initialize: function(options) {

    if ($.isEmptyObject(options.attributes) ||
        !("einID" in options.attributes) ) {
      this.set({ einID:  _.uniqueId("ein-track")});
    }
    this.bind("change:download", this.updateCollection);
  },

  updateCollection: function(model) {
    if (model.collection) {
      model.collection.trigger("change tracks");
    }
    else {
      console.error("Can't update a collection that doesn't exist");
    }
  },

});
