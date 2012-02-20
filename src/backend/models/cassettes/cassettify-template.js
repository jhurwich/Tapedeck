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
      var self = this; \
      self.getPage(1, context, callback); \
    }, /* end getBrowseList */ \
 \
    getPage: function(pageNum, context, callback) { \
      var self = this; \
      var pageURL = self.pattern.replace(/\\$#/g, pageNum); \
 \
      if (!self.isDumpCached(pageNum)) { \
        /* First hit the domain itself, usually the first page */ \
        $.ajax({ \
          type: "GET", \
          url: "http://www." + pageURL, \
          dataType: "html", \
   \
          success: self.parseResponse.curry(callback, pageNum, self), \
   \
          error: function (response) { \
            console.error("Ajax error retrieving " + self.domain + ", page " + pageNum); \
          }, \
        }); \
      } \
      else { \
        /* the dump for this cassette is cached and non-stale */ \
        var ourDump = $("#dump").find("#CassetteFromTemplate"); \
        var pageDump = $(ourDump).find("#page" + pageNum); \
        Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                             context      : $(pageDump), \
                                             callback     : callback }); \
      } \
    }, \
 \
    parseResponse: function(callback, page, self, data, status, xhr) { \
      var ourDump = $("#dump").find("#CassetteFromTemplate"); \
      if (ourDump.length == 0) { \
        ourDump = $("<div id=\'CassetteFromTemplate\'>"); \
        $(ourDump).appendTo($("#dump")); \
      } \
 \
      var pageDump = $(ourDump).find("#page" + page); \
      if (pageDump.length == 0) { \
        pageDump = $("<div id=\'page" + page + "\'>"); \
        $(pageDump).appendTo($(ourDump)); \
      } \
      var responseText = xhr.responseText; \
      var cleanedText = Tapedeck.Backend.TrackParser.Util.removeUnwantedTags(responseText); \
      $(pageDump).html(""); \
      $(pageDump).append(cleanedText); \
      $(pageDump).attr("expiry", (new Date()).getTime() + (1000 * 60 * 5)); /* 5 min */ \
 \
      Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                           context      : $(pageDump), \
                                           callback     : callback }); \
    }, \
 \
    isDumpCached: function(page) { \
      var ourDump = $("#dump").find("#CassetteFromTemplate"); \
      if (ourDump.length == 0) { \
        return false; \
      } \
 \
      var pageDump = $(ourDump).find("#page" + page); \
      if (pageDump.length > 0 && $(pageDump).attr("expiry") != null) { \
        var expiry = parseInt($(pageDump).attr("expiry")); \
        return ((expiry - (new Date()).getTime()) < 0); \
      } \
      else { \
        return false; \
      } \
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
