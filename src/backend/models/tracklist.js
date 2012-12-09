Tapedeck.Backend.Collections.TrackList = Backbone.Collection.extend({
  model: Tapedeck.Backend.Models.Track,

  serialize: function(maxSize) {
    var self = this;
    var bank = Tapedeck.Backend.Bank;
    if (typeof(maxSize) == "undefined") {
      maxSize = -1;
    }

    // based on numSerialize we need to split up this collection
    var result = [];
    var resultIndex = 0;
    var currArray = [];

    var estimateSize = function(serializedArray, splitNum) {
      var splitKey = null;
      if (splitNum === 0) {
        splitKey = self.getPrefix() + self.id;
      }
      else {
        splitKey = bank.splitListContinuePrefix + self.id + "@" + (splitNum-1);
      }

      // loop through once quickly to see if any of the serialized pieces will be too big
      var saveEstimate = {};
      saveEstimate[splitKey] = JSON.stringify(serializedArray);

      var estimateLength = JSON.stringify(saveEstimate).length;
      return estimateLength;
    };

    for (var i = 0; i < self.length; i++) {
      var model = self.at(i);
      currArray.push(model.serialize());

      if (maxSize > 0 && estimateSize(currArray, result.length) > maxSize) {
        var lastAdded = currArray.pop();
        result.push(JSON.stringify(currArray));
        currArray = [lastAdded];
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
  }
});
