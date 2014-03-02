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
      pageURL = pageURL.replace("http://", ""); \
      pageURL = pageURL.replace("www.", ""); \
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
          /* memoize the tracks for the url, once done we no longer need the dump for the page */ \
          self.saveTracksForURL(pageURL, params.tracks); \
          var ourDump = $("#dump").find("#CassetteFromTemplate"); \
          var pageDump = $(ourDump).find("#page" + pageNum); \
          pageDump.remove(); \
          callback(params); \
        } \
      }; \
 \
      if (!self.isDumpCached(pageNum, pageURL)) { \
        /* First hit the domain itself, usually the first page */ \
        Tapedeck.ajax({ \
          type: "GET", \
          url: "http://www." + pageURL, \
          dataType: "html", \
   \
          success: self.parseTopLevelPage.curry(saveClearAndCallback, pageURL, pageNum, self), \
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
        var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(url) + "\']"); \
 \
        Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                             context      : $(urlDump), \
                                             callback     : saveClearAndCallback, \
                                             moreCallback : self.addMoreCallback.curry(self, pageNum, pageURL), \
                                             finalCallback: self.finish.curry(self) }); \
      } \
    }, \
 \
    topSubPageSelectors: null, \
    /* convenience function to tidy up subPageSelectors for top-level */  \
    parseTopLevelPage: function(callback, url, page, self, responseText) { \
      /* TODO the topSubPageSelectors should be built here if null, not pre-coded.  Build them based on http://, www., domain, year, month, day... */ \
      if (self.topSubPageSelectors == null) { \
        var allSameDomainPrefixes = [self.domain + "/", "www." + self.domain + "/", "http://www." + self.domain + "/"]; \
 \
        var lastYear = 1988; \
        var today = new Date(); \
        var datedLinks = []; \
        for (var i = today.getFullYear(); i >= lastYear; i--) { \
          for (var j = 0; j < allSameDomainPrefixes.length; j++) { \
            datedLinks.push("a[href^=\'" + allSameDomainPrefixes[j] + i + "\/\']"); \
          } \
        } \
 \
        var allSameDomainAs = []; \
        for (var i = 0; i < allSameDomainPrefixes.length; i++) { \
          allSameDomainAs.push("a[href^=\'" + allSameDomainPrefixes[i] + "\']"); \
        } \
        self.topSubPageSelectors = [datedLinks.join(","), allSameDomainAs.join(",")]; \
      } \
 \
      self.parseResponse(callback, url, page, self.topSubPageSelectors, self, responseText); \
    }, \
 \
    /* all params are mandatory.  subPageSelectors is an array of strings or arrays, if an array the first string is selected and subsequent are filters of that set */ \
    parseResponse: function(callback, url, page, subPageSelectors, self, responseText) { \
      /* dumps are of the form: \
       * <div id="dump"> \
       *   <div id="(cassette name)"> \
       *     <div id="page(page num)"> \
       *       <div class="url" url="(encodeURIComponent(url))"> */ \
 \
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
 \
      var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(url) + "\']"); \
      if (urlDump.length == 0) { \
        urlDump = $("<div class=\'url\' url=\'" + encodeURIComponent(url) + "\'>"); \
        $(urlDump).appendTo($(pageDump)); \
      } \
 \
      responseText = Tapedeck.Backend.TrackParser.Util.inflateWPFlashObjects(responseText); \
      cleanedText = Tapedeck.Backend.TrackParser.Util.removeUnwantedTags(responseText); \
      $(urlDump).html(""); \
      $(urlDump).append(cleanedText); \
      $(urlDump).attr("expiry", (new Date()).getTime() + (1000 * 60 * 5)); /* 5 min */ \
 \
      /* TODO branch into all sub-URLS (recursively? - probably not the best idea) */ \
      if (subPageSelectors.length > 0) { \
        /* TODO this block is wrong and needs to be updated to reflected subPageSelectors */ \
        for (var i = 0; i < subPageSelectors.length; i++) { \
          console.log("SPS[" + i + "]: " + subPageSelectors[i]); \
          var selector = subPageSelectors[i]; \
          var removing = []; \
          if (typeof(selector) != "string") { \
            selector = subPageSelectors[i].shift(); \
            removing = subPageSelectors[i]; \
          } \
          var selected = $(urlDump).find(selector); \
 \
          console.log("1 selected.length: " + selected.length); \
          for (var j = 0; j < removing.length; j++) { \
            selected = $(selected).filter(removing[j]); \
            console.log((2 + j) + " selected.length: " + selected.length); \
          } \
          console.log("Z selected.length: " + selected.length); \
 \
          selected.each(function(index, elem) { \
            console.log(index + ") " + $(elem).attr("href")); \
 \
          }); \
        } \
      } \
 \
      Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                           context      : $(urlDump), \
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
    isDumpCached: function(page, url) { \
      var ourDump = $("#dump").find("#CassetteFromTemplate"); \
      if (ourDump.length == 0) { \
        return false; \
      } \
 \
      var pageDump = $(ourDump).find("#page" + page); \
      if (pageDump.length == 0) { \
        return false; \
      } \
 \
      var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(url) + "\']"); \
      if (urlDump.length > 0 && $(urlDump).attr("expiry") != null) { \
        var expiry = parseInt($(urlDump).attr("expiry")); \
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
