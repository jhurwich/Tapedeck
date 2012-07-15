Tapedeck.Backend.Models.Track = Backbone.Model.extend({

  initialize: function(options) {

    if ($.isEmptyObject(options.attributes) ||
        !("tdID" in options.attributes) ) {
      this.set({ tdID:  _.uniqueId("tapedeck-track")});
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
