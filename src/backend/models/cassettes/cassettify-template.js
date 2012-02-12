Tapedeck.Backend.CassetteManager.CassettifyTemplate = {

  template: ' \
  Tapedeck.Backend.Cassettes.CassetteFromTemplate = Tapedeck.Backend.Models.Cassette.extend({\
    domain : "<%= domain %>", \
    defaults : { \
      "name" : "_Unnamed_", \
      "developer" : "<%= domain %>", \
      "developerLink" : "<%= domain %>", \
    }, \
    pattern : "<%= pattern %>", \
   \
    /* No events, although probably want interval */ \
    events: [], \
   \
    getBrowseList: function(context, callback) { \
      console.log("GETTING BROWSE LIST"); \
      var self = this; \
 \
      var parseResponse = function(data, status, xhr) { \
        var responseText = xhr.responseText; \
        var cleanedText = Tapedeck.Backend.ParserSuite.Util.removeUnwantedTags(responseText); \
        $("#dump").append(cleanedText); \
   \
        Tapedeck.Backend.TrackParser.start($("#dump"), callback); \
      }; \
 \
      /* First hit the domain itself, usually the first page */ \
      $.ajax({ \
        type: "GET", \
        url: "http://www." + self.domain, \
        dataType: "html", \
 \
        success: parseResponse, \
 \
        error: function (response) { \
          console.error("Ajax error retrieving " + self.domain + ""); \
        }, \
      }); \
 \
    }, /* end getBrowseList */ \
  }); \
    '
/*
      var handleTracks = function(response, sender, sendResponse) {
        
        for (var i in response.tracks) {
          response.tracks[i].cassette = self.get("name");
        }
        callback(response.tracks);
      };
*/
  
};
