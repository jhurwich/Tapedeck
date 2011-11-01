Tapedeck.Backend.Models.Cassette = Backbone.Model.extend({
  name: "Unnamed Cassette",

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
});
