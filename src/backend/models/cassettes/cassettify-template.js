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
    /* Convenience function to tidy up for top-level \
     * The topSubPageTest looks for sub-urls that should be parsed on a top-level domain.  The test uses \
     * a heuristic of whitelisted url components including various commonly used strings and a regex pattern \
     * for any component of all numbers. -- Yeah, those slashes are right... */  \
    heuristicSubPageTest: function(url) { \
      var whitelistedComponents = [/\\\/content\\\//gi, \
                                   /\\\/archive\\\//gi, \
                                   /\\\/archives\\\//gi, \
                                   /\\\/media\\\//gi, \
                                   /\\\/news\\\//gi, \
                                   /\\\/article\\\//gi, \
                                   /\\\/\\d+\\\//gi, \
                                   /\\\/\\d+$/gi]; \
 \
      for (var i = 0; i < whitelistedComponents.length; i++) { \
        var tester = whitelistedComponents[i]; \
        if (tester.test(url)) { \
          return true; \
        } \
      } \
      return false; \
    }, \
 \
    blacklistSubPageTest: function(url) { \
      var blacklistedComponents = [/\\\/tag\\\//gi, \
                                   /\\\/category\\\//gi, \
                                   /\\\/page\\\//gi, \
                                   /comments$/gi]; \
 \
      for (var i = 0; i < blacklistedComponents.length; i++) { \
        var tester = blacklistedComponents[i]; \
        if (tester.test(url)) { \
          return true; \
        } \
      } \
      return false; \
    }, \
 \
    /* all params are mandatory */ \
    parseResponse: function(callback, url, page, self, responseText) { \
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
      var dumpForResponse = function(aURL, aText) { \
        var dump = $(pageDump).find(".url[url=\'" + encodeURIComponent(aURL) + "\']"); \
        if (dump.length == 0) { \
          dump = $("<div class=\'url\' url=\'" + encodeURIComponent(aURL) + "\'>"); \
          $(dump).appendTo($(pageDump)); \
        } \
        var cleanedText = Tapedeck.Backend.TrackParser.Util.inflateWPFlashObjects(aText); \
        cleanedText = Tapedeck.Backend.TrackParser.Util.removeUnwantedTags(cleanedText); \
        $(dump).html(""); \
        $(dump).append(cleanedText); \
        $(dump).attr("expiry", (new Date()).getTime() + (1000 * 60 * 5)); /* 5 min */ \
        return dump; \
      }; \
 \
      var topURLDump = dumpForResponse(url, responseText); \
 \
      /* Determine if we should dive into subpages and which.  First get all links to the same domain, /__ is a shorthand for same domain */ \
      var allSameDomainPrefixes = ["/", self.domain + "/", "www." + self.domain + "/", "http://www." + self.domain + "/"]; \
      var allSameDomainAs = []; \
      for (var i = 0; i < allSameDomainPrefixes.length; i++) { \
        allSameDomainAs.push("a[href^=\'" + allSameDomainPrefixes[i] + "\']"); \
      } \
      var selected = $(topURLDump).find(allSameDomainAs.join(",")); \
 \
      /* use the providede heuristicSubPageTest to see if we can get a reduced set of applicable links */ \
      selected = selected.filter(function(index) {  \
        var elem = this; \
        return self.heuristicSubPageTest($(elem).attr("href").trim()); \
      }); \
 \
      /* heuristic match failed, bring in all same domain links */ \
      if (selected.length == 0) { \
        selected = $(topURLDump).find(allSameDomainAs.join(",")); \
      } \
 \
      /* now use the blacklist test to reject those we do not branch into */ \
      selected = selected.filter(function(index) {  \
        var elem = this; \
        return !self.blacklistSubPageTest($(elem).attr("href").trim()); \
      }); \
 \
      /* dedupe the subURLs and then branch into them */ \
      var dedupeURLs = {}; \
      selected.each(function(index, elem) { \
        dedupeURLs[$(elem).attr("href")] = 1; \
      }); \
      var subURLs = Object.keys(dedupeURLs); \
 \
      /* TODO: Figure out subURL branching \
       *   1. should parse the topURL first, and subpages in parallel \
       *   2. the addTracks method supports this parallelism \
       *   3. given you have the contents for topURL, parse it first and in the callback kickoff the ajax for suburls \
       *   4. use TrackParser with addTracks to parse and add the new tracks from subURLs \
       *   5. make sure you save the urls and tracks so they are memoized (and perhaps fix a bug in there) */ \
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
