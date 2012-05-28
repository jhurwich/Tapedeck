Tapedeck.Backend.Collections.Playlist =
  Tapedeck.Backend.Collections.TrackList.extend({


  initialize: function(options) {
    if (!("name" in options)) {
      options.name = "Unnamed Playlist";
    }
  },

    // override the toJSON so that the id is preserved
  toJSON: function() {
    var json = Backbone.Collection.prototype.toJSON.call(this);

    json['id'] = this.id;
    return json;
  },
});
