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
      /* First hit the domain itself, usually the first page */ \
      $.ajax({ \
        type: "GET", \
        url: "http://www." + self.domain, \
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
 \
    parseResponse: function(response) { \
      var div = document.getElementById("dump"); \
      console.log(div.tagName); \
      $(div).load(response); \
      var links = $(div).find("a"); \
      console.log(links.length); \
      var xmlDoc = $.parseXML(body); \
 \
      console.log("got response::" + $(xmlDoc).html()); \
      var closeHead = response.indexOf("</head>"); \
 \
      var doc = $(response); \
      console.log(">>" + doc.html()); \
 \
    }, \
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
