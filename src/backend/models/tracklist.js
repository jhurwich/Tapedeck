Tapedeck.Backend.Collections.TrackList = Backbone.Collection.extend({
  model: Tapedeck.Backend.Models.Track,

  serialize: function(numSerialize) {
    if (typeof(numSerialize) == "undefined") {
      numSerialize = 1;
    }

    // based on numSerialize we need to split up this collection
    var result = [];
    var resultIndex = 0;
    var splitSize = Math.floor(this.length / numSerialize); // the final size of each group (potentially + 1)
    var currArray = [];
    for (var i = 0; i < this.length; i++) {
      var model = this.at(i);
      currArray.push(model.serialize());

      if (((i + 1) % splitSize == 0) &&
          result.length < numSerialize - 1) {
        result.push(JSON.stringify(currArray));
        currArray = [];
      }
    }
    result.push(JSON.stringify(currArray));

    return result;
  },

  TEMP_PROPS: [
    "listened",
    "playing"
  ],
  removeTempProperties: function() {
    var tempProps = Tapedeck.Backend.Collections.TrackList.prototype.TEMP_PROPS;
    this.each(function(track) {
      for (var i = 0; i < tempProps.length; i++) {
        track.unset(tempProps[i], { silent: true });
      }
    });
  },

  makePlaylist: function(id) {
    var playlist = new Tapedeck.Backend.Collections.Playlist(this.models, { id: id });
    playlist.removeTempProperties(); // TODO do we need this

    return playlist;
  },

  // override the toJSON so that the destination is preserved
  toJSON: function() {
    var json = Backbone.Collection.prototype.toJSON.call(this);

    json['destination'] = this.destination;
    return json;
  },
});
