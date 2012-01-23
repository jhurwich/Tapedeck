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
      var self = this; \
 \
      /* First hit the domain itself, usually the first page */ \
      $.ajax({ \
        type: "GET", \
        url: self.domain, \
        dataType: "html", \
 \
        success: self.parseResponse, \
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
