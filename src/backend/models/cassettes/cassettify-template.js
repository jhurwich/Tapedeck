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
      /* Check if we already have the tracks saved for this page */ \
      var foundTracks = Tapedeck.Backend.Bank.getTracksForURL(pageURL); \
      if (foundTracks != null && foundTracks.length > 0) { \
        /* Its possible we appropriated another cassettes page, rebrand */ \
        if (foundTracks[0].cassette != self.get("name")) { \
          for (var i = 0; i < foundTracks.length; i++) { \
            foundTracks[i].cassette = self.get("name"); \
          } \
        } \
        callback(foundTracks); \
        return; \
      } \
 \
      /* Modify the callback slightly so that the tracks are saved */ \
      var saveClearAndCallback = function(tracks) { \
        Tapedeck.Backend.Bank.saveTracksForURL(pageURL, tracks); \
        var ourDump = $("#dump").find("#CassetteFromTemplate"); \
        var pageDump = $(ourDump).find("#page" + pageNum); \
        pageDump.remove(); \
        callback(tracks); \
      }; \
 \
      if (!self.isDumpCached(pageNum)) { \
        /* First hit the domain itself, usually the first page */ \
        $.ajax({ \
          type: "GET", \
          url: "http://www." + pageURL, \
          dataType: "html", \
   \
          success: self.parseResponse.curry(saveClearAndCallback, pageURL, pageNum, self), \
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
                                             callback     : saveClearAndCallback, \
                                             moreCallback : self.addMoreCallback.curry(pageURL) }); \
      } \
    }, \
 \
    parseResponse: function(callback, url, page, self, data, status, xhr) { \
      var ourDump = $("#dump").find("#CassetteFromTemplate"); \
      if (ourDump.length == 0) { \
        ourDump = $("<div id=\'CassetteFromTemplate\'>"); \
        $(ourDump).appendTo($("#dump")); \
      } \
 \
      var pageDump = $(ourDump).find("#page" + page); \
      if (pageDump.length == 0) { \
        pageDump = $("<div id=\'page" + page + "\' url=\'" + url + "\'>"); \
        $(pageDump).appendTo($(ourDump)); \
      } \
      var responseText = xhr.responseText; \
      responseText = Tapedeck.Backend.TrackParser.Util.inflateWPFlashObjects(responseText); \
      cleanedText = Tapedeck.Backend.TrackParser.Util.removeUnwantedTags(responseText); \
      $(pageDump).html(""); \
      $(pageDump).append(cleanedText); \
      $(pageDump).attr("expiry", (new Date()).getTime() + (1000 * 60 * 5)); /* 5 min */ \
 \
      Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                           context      : $(pageDump), \
                                           callback     : callback, \
                                           moreCallback : self.addMoreCallback.curry(url) }); \
    }, \
 \
    addMoreCallback: function(url, tracks) { \
      Tapedeck.Backend.Bank.saveMoreTracksForURL(url, tracks); \
      Tapedeck.Backend.MessageHandler.addTracksAndPushBrowseList(tracks); \
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
