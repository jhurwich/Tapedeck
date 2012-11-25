Tapedeck.Backend.Cassettes.TestCassette2 = Tapedeck.Backend.Models.Cassette.extend({
  defaults : {
    "name" : "TestCassette2",
    "developer" : "Jhawk",
    "developerLink" : "www.tape-deck.com",
  },

  // Don't want the interval event
  events: [
    { event  : "pageload",
      do     : "reload" }
  ],

  getBrowseList: function(context, callback, errCallback) {
    var self = this;
    var handleTracks = function(response, sender, sendResponse) {
      console.log("----TestCassette2 received tracks" );

      if (typeof(response.error) != "undefined") {
        console.error("ERROR IN SCRAPER CASSETTE's PARSING: " + JSON.stringify(response.error));
        errCallback(response.error);
      }
      else {
        for (var i in response.tracks) {
          response.tracks[i].cassette = self.get("name");
        }
        callback(response);
      }
    };

    var prepCode = "TapedeckInjected.Utils.setLogs(" + JSON.stringify(Tapedeck.Backend.Utils.logLevels) + ");";
    Tapedeck.Backend.InjectManager
                    .executeScript(context.tab,
                                   { allFrames: false,
                                     file: "frontend/scripts/track-parser.js" },
                                   handleTracks,
                                   { cassetteName : self.get("name") },
                                   prepCode);
  }
});
