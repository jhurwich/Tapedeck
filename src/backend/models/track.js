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
  
  DONT_SERIALIZE_PROPERTIES: ['description', 'location'],
  serialize: function() {
    var serialized = this.toJSON();
    for (var i = 0; i < this.DONT_SERIALIZE_PROPERTIES.length; i++) {
      var dontInclude = this.DONT_SERIALIZE_PROPERTIES[i];
      delete serialized[dontInclude];
    }
    return serialized;
  },
});
