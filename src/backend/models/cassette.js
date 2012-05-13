Tapedeck.Backend.Models.Cassette = Backbone.Model.extend({
  defaults : {
    "name" : "Unnamed Cassette",
    "developer" : "Unknown Developer",
    "developerLink" : "",
  },

  initialize: function(options) {
    if ($.isEmptyObject(options.attributes) ||
        !("tdID" in options.attributes) ) {

      // Names should be the unique indicator of choice, not this id
      this.set({ tdID:  _.uniqueId("tapedeck-cassette")});
    }
  },

  // Default events
  events: [
    { event  : "pageload",
      do     : "reload" },
    { event  : "interval",
      period : 300,
      do     : "reload" }
  ],

  // No menuitems by default
  menuitems: [],

  isPageable: function() {
    return (typeof(this.getPage) != "undefined");
  },

  // override the toJSON so that isPageable is sent as bool
  toJSON: function() {
    var json = Backbone.Model.prototype.toJSON.call(this);

    json['isPageable'] = this.isPageable();
    return json;
  },
});
