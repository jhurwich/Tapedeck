Tapedeck.Backend.Cassettes.ScraperCassette = Tapedeck.Backend.Models.Cassette.extend({
  defaults : {
    "name" : "Scraper",
    "developer" : "Jhawk",
    "developerLink" : "www.tape-deck.com",
  },

  // Don't want the interval event
  events: [
    { event  : "pageload",
      do     : "reload" }
  ],

  getBrowseList: function(context, callback) {
    var self = this;
    var handleTracks = function(response, sender, sendResponse) {
      
      for (var i in response.tracks) {
        response.tracks[i].cassette = self.get("name");
      }
      callback(response.tracks);
    };
    
    Tapedeck.Backend.MessageHandler
                    .executeScript(context.tab,
                                   { allFrames: false,
                                     file: "frontend/scripts/track-parser.js" },
                                   handleTracks);
  } 
});
