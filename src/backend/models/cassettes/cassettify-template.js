Tapedeck.Backend.CassetteManager.CassettifyTemplate = {

  template: ' \
  Tapedeck.Backend.Cassettes.CassetteFromTemplate = Tapedeck.Backend.Models.Cassette.extend({\
    domain : "<%= params.domain %>", \
    defaults : { \
      "name" : "Unnamed", \
      "developer" : "<%= params.domain %>", \
      "developerLink" : "<%= params.domain %>", \
    }, \
    pattern : "<%= params.pattern %>", \
   \
    /* No events, although probably want interval */ \
    events: [], \
   \
    getBrowseList: function(context, callback, errCallback, finalCallback) { \
      var self = this; \
      self.getPage(1, context, callback, errCallback, finalCallback); \
    }, /* end getBrowseList */ \
 \
    getPage: function(pageNum, context, callback, errCallback, finalCallback) { \
      var self = this; \
      if (typeof(finalCallback) != "undefined") { \
        self.finalCallback = finalCallback; \
      } \
      var pageURL = self.pattern.replace(/\\$#/g, pageNum); \
 \
      /* Check if we already have the tracks saved for this page */ \
      var foundTracks = self.getTracksForURL(pageURL); \
      if (foundTracks != null && foundTracks.length > 0) { \
        /* Its possible we appropriated another cassettes page, rebrand */ \
        if (foundTracks[0].cassette != self.get("name")) { \
          for (var i = 0; i < foundTracks.length; i++) { \
            foundTracks[i].cassette = self.get("name"); \
          } \
        } \
        callback({ tracks: foundTracks, stillParsing: false }); \
        self.finalCallback({ success: true }); \
        return; \
      } \
 \
      /* Modify the callback slightly so that the tracks are saved */ \
      var saveClearAndCallback = function(params) { \
        if (typeof(params.error) != "undefined") { \
          console.error("Error parsing tracks for " + self.domain + ", page " + pageNum); \
          errCallback(params.error); \
        } \
        else { \
          self.saveTracksForURL(pageURL, params.tracks); \
          var ourDump = $("#dump").find("#CassetteFromTemplate"); \
          var pageDump = $(ourDump).find("#page" + pageNum); \
          pageDump.remove(); \
          callback(params); \
        } \
      }; \
 \
      if (!self.isDumpCached(pageNum)) { \
        /* First hit the domain itself, usually the first page */ \
        Tapedeck.ajax({ \
          type: "GET", \
          url: "http://www." + pageURL, \
          dataType: "html", \
   \
          success: self.parseResponse.curry(saveClearAndCallback, pageURL, pageNum, self), \
   \
          error: function (response) { \
            console.error("Ajax error retrieving " + self.domain + ", page " + pageNum); \
            errCallback({ message: "CassetteError" }); \
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
                                             moreCallback : self.addMoreCallback.curry(self, pageNum, pageURL), \
                                             finalCallback: self.finish.curry(self) }); \
      } \
    }, \
 \
    parseResponse: function(callback, url, page, self, responseText) { \
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
 \
      responseText = Tapedeck.Backend.TrackParser.Util.inflateWPFlashObjects(responseText); \
      cleanedText = Tapedeck.Backend.TrackParser.Util.removeUnwantedTags(responseText); \
      $(pageDump).html(""); \
      $(pageDump).append(cleanedText); \
      $(pageDump).attr("expiry", (new Date()).getTime() + (1000 * 60 * 5)); /* 5 min */ \
 \
      Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                           context      : $(pageDump), \
                                           callback     : callback, \
                                           moreCallback : self.addMoreCallback.curry(self, page, url), \
                                           finalCallback: self.finish.curry(self) }); \
    }, \
 \
    addMoreCallback: function(self, pageNum, url, tracks) { \
      self.saveMoreTracksForURL(url, tracks); \
      Tapedeck.Backend.MessageHandler.addTracks(pageNum, tracks); \
    }, \
 \
    finish: function(self, params) { \
      self.finalCallback(params); \
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
 \
    urlMap: { }, \
    collectorID: null, \
    saveTracksForURL: function(url, tracks) { \
      url = url.replace("http://", ""); \
      url = url.replace("www.", ""); \
 \
      var expiry =(new Date()).getTime() + (1000 * 60 * 15); /* in 15 min */ \
      this.urlMap[url] = { tracks: tracks, expiry: expiry }; \
      if (this.collectorID == null) { \
        this.collectorID = window.setInterval(this.memoryCollector, 1000 * 60 * 5); /* 5 min */ \
      }; \
    }, \
 \
    saveMoreTracksForURL: function(url, tracks) { \
      url = url.replace("http://", ""); \
      url = url.replace("www.", ""); \
 \
      var currTracks = this.urlMap[url].tracks; \
      tracks = currTracks.concat(tracks); \
 \
      var expiry =(new Date()).getTime() + (1000 * 60 * 15); /* in 15 min */ \
      this.urlMap[url] = { tracks: tracks, expiry: expiry }; \
    }, \
 \
    getTracksForURL: function(url) { \
      if (typeof(this.urlMap[url]) != "undefined") { \
        if ((this.urlMap[url].expiry - (new Date()).getTime()) < 0) { \
          delete this.urlMap[url]; \
          return null; \
        } \
        return this.urlMap[url].tracks; \
      } \
      else { \
        return null; \
      } \
    }, \
 \
    /* Cleanup any expired pages */ \
    memoryCollector: function() { \
      for(var url in this.urlMap) { \
        var expiry = this.urlMap[url].expiry; \
        if ((expiry - (new Date()).getTime()) < 0) { \
          delete this.urlMap[url]; \
        } \
      } \
    }, \
 \
  }); \
    '
};
