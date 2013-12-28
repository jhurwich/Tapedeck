Tapedeck.Backend.Cassettes.Mock = Tapedeck.Backend.Models.Cassette.extend({
  defaults : {
    "name" : "Mock",
    "developer" : "Jhawk",
    "developerLink" : "www.tape-deck.com"
  },

  // Don't want the interval event
  events: [
    { event  : "pageload",
      do     : "reload" }
  ],

  delay: 1000,
  numTestTracks: 10,

  testTracks: [],

  trackExamples: [
    {
      trackName: "Vietnam",
      artistName: "Crystal Castles",
      type: "mock",
      url: "tape-deck.com/test/track1",
      domain: "tape-deck.com/test/",
      location: "tape-deck.com/test/track1",
      cassette: "Mock"
    }, {
      trackName: "Voyager",
      artistName: "Daft Punk",
      type: "mock",
      url: "tape-deck.com/test/track2",
      domain: "tape-deck.com/test/",
      location: "tape-deck.com/test/track2",
      cassette: "Mock"
    }, {
      trackName: "Skinny Love",
      artistName: "Bon Iver",
      type: "mock",
      url: "tape-deck.com/test/track3",
      domain: "tape-deck.com/test/",
      location: "tape-deck.com/test/track3",
      cassette: "Mock"
    }, {
      trackName: "I Need Air (Feat. Angela Hunter)",
      artistName: "Magnetic Man",
      type: "mock",
      url: "tape-deck.com/test/track4",
      domain: "tape-deck.com/test/",
      location: "tape-deck.com/test/track4",
      cassette: "Mock"
    }, {
      trackName: "Daylight",
      artistName: "Matt and Kim",
      type: "mock",
      url: "tape-deck.com/test/track5",
      domain: "tape-deck.com/test/",
      location: "tape-deck.com/test/track5",
      cassette: "Mock"
    }
  ],

  getBrowseList: function(context, callback, errCallback, finalCallback) {
    this.getPage(1, context, callback, errCallback, finalCallback);
  },

  getPage: function(pageNum, context, callback, errCallback, finalCallback) {
    var self = this;
    while (self.testTracks.length < self.numTestTracks) {
      var diff = self.numTestTracks - self.testTracks.length;
      self.testTracks.push(self.trackExamples[(diff % 5)]);
    }
    setTimeout(function() {
      finalCallback({ tracks: self.testTracks, success: true });
    }, self.delay);
  },

  errorHandler: function(params, successCallback, errCallback) {
    console.error("ERROR in Mock cassette");
  }
});
