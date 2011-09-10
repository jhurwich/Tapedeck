Einplayer.Backend.Cassettes.ScraperCassette = Einplayer.Backend.Models.Cassette.extend({

  name: "Scraper",

  // Don't want the interval event
  events: [
    { event  : "pageload",
      do     : "reload" }
  ],

  getBrowseList: function(context, callback) {

    var handleTracks = function(response, sender, sendResponse) {

      var tracks = response.tracks;
      callback(response.tracks);
    };
    
    Einplayer.Backend.MessageHandler
                     .executeScript(context.tab,
                                    {allFrames: false,
                                     file: "frontend/scripts/track-parser.js"},
                                    handleTracks);
  } 
});
