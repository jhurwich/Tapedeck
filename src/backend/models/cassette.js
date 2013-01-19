Tapedeck.Backend.Models.Cassette = Backbone.Model.extend({
  defaults : {
    "name" : "Unnamed Cassette",
    "developer" : "Unknown Developer",
    "developerLink" : ""
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

  isBrowseable: function() {
    return (typeof(this.getBrowseList) != "undefined");
  },
  isPageable: function() {
    return (typeof(this.getPage) != "undefined");
  },

  generateReport: function() {
    /* The report should include
     *  {
     *    name: "string",
     *    isBrowseable: boolean,
     *    isPageable: boolean,
     *    tdID: "string",
     *    developer: "string",
     *    developerLink: "string"
     *  }
     */

     var report = {
       name: this.get("name"),
       tdID: this.get("tdID"),
       developer: this.get("developer"),
       developerLink: this.get("developerLink"),
       isBrowseable: this.isBrowseable(),
       isPageable: this.isPageable(),
       defaultFeed: this.get("defaultFeed"),
       feeds: this.feeds,
       beforePlay: this.beforePlay
     };

     return report;
  },

  // override the toJSON so that isPageable is sent as bool
  toJSON: function() {
    var json = Backbone.Model.prototype.toJSON.call(this);

    json['isPageable'] = this.isPageable();
    json['isBrowseable'] = this.isBrowseable();
    return json;
  }
});
