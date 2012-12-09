Tapedeck.Backend.Models.Track = Backbone.Model.extend({

  initialize: function(attributes) {
    var attributes = this.parse(attributes);
    this.clear({ silent: true });
    this.set(attributes, { silent: true });

    if ($.isEmptyObject(attributes) ||
        !("tdID" in attributes) ) {
      this.set({ tdID:  _.uniqueId("tapedeck-track")});
    }
  },

  serialize: function() {
    var bank = Tapedeck.Backend.Bank;
    var serialized = this.toJSON();

    // delete the properties that we don't want to save
    for (var i = 0; i < bank.DONT_SERIALIZE_PROPERTIES.length; i++) {
      var dontInclude = bank.DONT_SERIALIZE_PROPERTIES[i];
      delete serialized[dontInclude];
    }

    // map the attribute names that we will save to minified versions
    for (var fullName in bank.MINIFY_MAP) {
      var minName = bank.MINIFY_MAP[fullName];
      serialized[minName] = serialized[fullName];
      delete serialized[fullName];
    }

    return serialized;
  },

  // we override the parse method to unminify
  parse: function(attributes) {
    var bank = Tapedeck.Backend.Bank;

    for (var minName in bank.UNMINIFY_MAP) {
      if (minName in attributes) {
        var fullName = bank.UNMINIFY_MAP[minName];
        attributes[fullName] = attributes[minName];
        delete attributes[minName];
      }
    }
    return attributes;
  }
});
