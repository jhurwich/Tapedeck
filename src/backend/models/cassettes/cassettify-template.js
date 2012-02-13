Tapedeck.Backend.CassetteManager.CassettifyTemplate = {

  template: ' \
  Tapedeck.Backend.Cassettes.CassetteFromTemplate = Tapedeck.Backend.Models.Cassette.extend({\
    domain : "<%= domain %>", \
    defaults : { \
      "name" : "Unnamed", \
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
      var ourDump = $("#dump").find("#CassetteFromTemplate"); \
      if (ourDump.length == 0) { \
        console.log("making new dump"); \
        ourDump = $("<div id=\'CassetteFromTemplate\'>"); \
        $(ourDump).appendTo($("#dump")); \
      } \
 \
      var ourDumpIsCached = function() { \
        if ($(ourDump).attr("filled-at") != null) { \
          var filled = parseInt($(ourDump).attr("filled-at")); \
          var diff = (new Date()).getTime() - filled; \
          console.log("diff: " + diff); \
          return (diff / 1000 / 60 / 60 < 1); \
        } \
        else { \
          return false; \
        } \
      }; \
 \
      if (!ourDumpIsCached()) { \
        var parseResponse = function(data, status, xhr) { \
          var responseText = xhr.responseText; \
          var cleanedText = Tapedeck.Backend.ParserSuite.Util.removeUnwantedTags(responseText); \
          $(ourDump).append(cleanedText); \
          $(ourDump).attr("filled-at", (new Date()).getTime()); \
     \
          Tapedeck.Backend.TrackParser.start($(ourDump), callback); \
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
      } \
      else { \
        /* the dump for this cassette is cached and non-stale */ \
        Tapedeck.Backend.TrackParser.start($(ourDump), callback); \
      } \
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
