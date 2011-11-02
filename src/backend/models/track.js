Tapedeck.Backend.Models.Track = Backbone.Model.extend({

  initialize: function(options) {

    if ($.isEmptyObject(options.attributes) ||
        !("tdID" in options.attributes) ) {
      this.set({ tdID:  _.uniqueId("tapedeck-track")});
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
