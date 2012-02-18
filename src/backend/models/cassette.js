Tapedeck.Backend.Models.Cassette = Backbone.Model.extend({
  defaults : {
    "name" : "Unnamed Cassette",
    "developer" : "Unknown Developer",
    "developerLink" : "",
  },

  initialize: function(options) {
    if ($.isEmptyObject(options.attributes) ||
        !("tdID" in options.attributes) ) {
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
});
