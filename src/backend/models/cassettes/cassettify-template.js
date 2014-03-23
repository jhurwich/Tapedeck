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
    outstandingURLs: {}, \
    errorCount: 0, \
    getPage: function(pageNum, context, callback, errCallback, finalCallback) { \
      var self = this; \
      if (Object.keys(self.outstandingURLs).length > 0) { \
        console.error("getPage called before previous call could complete - terminating last call, sending " + self.pageTracks.length + " tracks -- remaining URLs: " + JSON.stringify(outstandingURLs)); \
        self.errCallback({ message: "CassetteError" }); \
        self.finalCallback({ tracks: self.getTracksForPage(pageNum) }); \
      } \
      self.outstandingURLs = {}; \
      self.errorCount = 0; \
      self.errCallback = errCallback; \
      if (typeof(finalCallback) != "undefined") { \
        self.finalCallback = finalCallback; \
      } \
      var pageURL = self.pattern.replace(/\\$#/g, pageNum); \
      pageURL = pageURL.replace("http://", ""); \
      pageURL = pageURL.replace("www.", ""); \
 \
      /* Check if we already have the tracks saved for this page */ \
      var foundTracks = self.getTracksForURL(pageURL); \
      if (foundTracks !== null && foundTracks.length > 0) { \
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
      if (!self.isDumpCached(pageNum, pageURL)) { \
        self.parsePage(self, pageNum, pageURL, true, callback); \
      } \
      else { \
        /* the dump for this cassette is cached and non-stale */ \
        var ourDump = $("#dump").find("#CassetteFromTemplate"); \
        var pageDump = $(ourDump).find("#page" + pageNum); \
        var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(pageURL) + "\']"); \
 \
        /* TODO make sure this respects that a page can have multiple URL dumps */ \
 \
        Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                             context      : $(urlDump), \
                                             callback     : self.postScrapeCallback.curry(pageNum, pageURL, [], callback), \
                                             moreCallback : self.addMoreCallback.curry(self, pageNum, pageURL), \
                                             finalCallback: self.final.curry(self, pageNum, pageURL) }); \
      } \
    }, \
 \
    /* all params are mandatory - doParseSubPages indicates if subPages should be queried and parsed */ \
    parsePage: function(self, page, url, doParseSubPages, callback) { \
      var handleResponse = function(responseText) { \
        /* dumps are of the form: \
         * <div id="dump"> \
         *   <div id="(cassette name)"> \
         *     <div id="page(page num)"> \
         *       <div class="url" url="(encodeURIComponent(url))"> */ \
 \
        var ourDump = $("#dump").find("#CassetteFromTemplate"); \
        if (ourDump.length === 0) { \
          ourDump = $("<div id=\'CassetteFromTemplate\'>"); \
          $(ourDump).appendTo($("#dump")); \
        } \
 \
        var pageDump = $(ourDump).find("#page" + page); \
        if (pageDump.length === 0) { \
          pageDump = $("<div id=\'page" + page + "\'>"); \
          $(pageDump).appendTo($(ourDump)); \
        } \
 \
        var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(url) + "\']"); \
        if (urlDump.length === 0) { \
          urlDump = $("<div class=\'url\' url=\'" + encodeURIComponent(url) + "\'>"); \
          $(urlDump).appendTo($(pageDump)); \
        } \
        var cleanedText = Tapedeck.Backend.TrackParser.Utils.inflateWPFlashObjects(responseText); \
        cleanedText = Tapedeck.Backend.TrackParser.Utils.removeUnwantedTags(cleanedText); \
        $(urlDump).html(""); \
        $(urlDump).append(cleanedText); \
        $(urlDump).attr("expiry", (new Date()).getTime() + (1000 * 60 * 5)); /* 5 min */ \
 \
        var subURLs = []; \
        if (doParseSubPages) { \
          /* Determine if we should dive into subpages and which.  First get all links to the same domain, /__ is a shorthand for same domain */ \
          var allSameDomainPrefixes = ["/", self.domain + "/", "www." + self.domain + "/", "http://www." + self.domain + "/"]; \
          var allSameDomainAs = []; \
          for (var i = 0; i < allSameDomainPrefixes.length; i++) { \
            allSameDomainAs.push("a[href^=\'" + allSameDomainPrefixes[i] + "\']"); \
          } \
          var selected = $(urlDump).find(allSameDomainAs.join(",")); \
 \
          /* use the providede heuristicSubPageTest to see if we can get a reduced set of applicable links */ \
          selected = selected.filter(function(index) {  \
            var elem = this; \
            return self.heuristicSubPageTest($(elem).attr("href").trim()); \
          }); \
 \
          /* heuristic match failed, bring in all same domain links */ \
          if (selected.length === 0) { \
            selected = $(urlDump).find(allSameDomainAs.join(",")); \
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
            var subURL = $(elem).attr("href").replace("http://", "").replace("www.", ""); \
            dedupeURLs[subURL] = 1; \
          }); \
          subURLs = Object.keys(dedupeURLs); \
        } \
 \
        /* TODO: Figure out subURL branching \
         *   1. should parse the topURL first, and subpages in parallel \
         *   2. the addTracks method supports this parallelism \
         *   3. given you have the contents for topURL, parse it first and in the callback kickoff the ajax for suburls \
         *   4. use TrackParser with addTracks to parse and add the new tracks from subURLs \
         *   5. make sure you save the urls and tracks so they are memoized (and perhaps fix a bug in there) \
         *   6. isParsing should be true if there are subPages being processed - will need to clear that */ \
 \
        Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                             context      : $(urlDump), \
                                             callback     : self.postScrapeCallback.curry(self, page, url, subURLs, callback), \
                                             moreCallback : self.addMoreCallback.curry(self, page, url), \
                                             finalCallback: self.final.curry(self, page, url) }); \
      }; /* end handleResponse */ \
 \
      if (typeof(self.outstandingURLs[url]) == "undefined") { \
        self.outstandingURLs[url] = 1; \
      } else { \
        self.outstandingURLs[url] = self.outstandingURLs[url] + 1; \
      } \
      Tapedeck.ajax({ \
        type: "GET", \
        url: "http://www." + url, \
        dataType: "html", \
 \
        success: handleResponse, \
 \
        error: function (response) { \
          console.error("Ajax error retrieving " + self.domain + ", page " + page); \
          self.errorCount = self.errorCount + 1; \
          self.final(self, page, url, { error: { message: "CassetteError" }}); \
        }, \
      }); \
    }, \
 \
    postScrapeCallback: function(self, page, topURL, subURLs, callback, params) { \
      if (typeof(params.error) != "undefined") { \
        console.error("Error parsing tracks for " + self.domain + ", page " + page); \
        self.errorCount = self.errorCount + 1; \
        self.final(self, page, topURL, { error: { message: "CassetteError" }}); \
        return; \
      } \
 \
      var expectedCallbacks = subURLs.length; \
 \
      /* memoize the tracks for the url, once done we no longer need the dump for that url */ \
      var tryFinish = function(aURL, aParams) { \
        if (typeof(aParams.tracks) != "undefined" && aParams.tracks !== null && aParams.tracks.length > 0) { \
          self.saveTracks(page, aURL, aParams.tracks); /* TODO ensure that saving tracks for subURLs is alright and working properly */ \
        } \
        if (expectedCallbacks <= 0) { \
          var ourDump = $("#dump").find("#CassetteFromTemplate"); \
          var pageDump = $(ourDump).find("#page" + page); \
          var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(topURL) + "\']"); \
          urlDump.remove(); \
          console.log("    Calling back - Dumps remaining for page " + page + ": " + pageDump.children().length); \
 \
          callback(aParams); \
        } \
      }; \
 \
      var length = subURLs.length; \
      while(subURLs.length > 0) { \
        var subURL = subURLs.shift(); \
 \
        var scoped = function(aSubURL) { \
          self.parsePage(self, page, aSubURL, false, function(aParams) { \
            /* completed parsing subPage */ \
            expectedCallbacks = expectedCallbacks - 1; \
            console.log("Completed subpage : " + aSubURL + " - (" + expectedCallbacks + "/" + length + ")"); \
 \
            if (typeof(aParams.error) != "undefined") { \
              console.error("Error parsing tracks for " + self.domain + ", page " + page + ", subURL " + aSubURL); \
            } \
 \
            tryFinish(aSubURL, aParams); \
          }); \
        }; /* end scoped */ \
        scoped(subURL); \
      } \
      tryFinish(topURL, params); \
    }, \
 \
    addMoreCallback: function(self, page, url, tracks) { \
      console.log("   :::  Adding more for " + url); \
      self.saveTracks(page, url, tracks); \
      Tapedeck.Backend.MessageHandler.addTracks(page, tracks); \
    }, \
 \
    /* finalCallback should be called once, when the page and subPages have been parsed to completion. \
     * params.tracks should be the complete list of all tracks, sorted */ \
    final: function(self, page, url, params) { \
      console.log("GOT FINaL : " + JSON.stringify(params)); \
      if (!params.success) { \
        /* there was some error */ \
        console.log("ERROR ON " + url + " will retry: " + (self.outstandingURLs[url] <= 1)); \
 \
        if (self.outstandingURLs[url] <= 1) { \
          /* first failure, retry */ \
          self.parsePage(self, page, url, false, function(aParams) { \
            /* completed retry */ \
            if (typeof(aParams.error) != "undefined") { \
              console.error("Error retrying request for " + self.domain + ", page " + page + ", url " + url); \
            } \
            self.final(self, page, url, aParams); /* TODO: fix this, this is not how finalCallback works - this is the synchronous callback. */ \
          }); \
          return; \
        } else { \
          /* we have already retried once, give up for this url */ \
          console.log("ERROR FOR " + url + " is unrecoverable."); \
        } \
      } \
      delete self.outstandingURLs[url]; \
      if (Object.keys(self.outstandingURLs).length <= 0) { \
        if (self.errorCount > 0) { \
          params.errorCount = self.errorCount; \
        } \
        self.finalCallback(params); \
      } \
    }, \
 \
    /* The topSubPageTest looks for sub-urls that should be parsed on a top-level domain.  The test uses \
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
    isDumpCached: function(page, url) { \
      var ourDump = $("#dump").find("#CassetteFromTemplate"); \
      if (ourDump.length === 0) { \
        return false; \
      } \
 \
      var pageDump = $(ourDump).find("#page" + page); \
      if (pageDump.length === 0) { \
        return false; \
      } \
 \
      var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(url) + "\']"); \
      if (urlDump.length > 0 && $(urlDump).attr("expiry") !== null) { \
        var expiry = parseInt($(urlDump).attr("expiry"), 10); \
        return ((expiry - (new Date()).getTime()) < 0); \
      } \
      else { \
        return false; \
      } \
    }, \
 \
    pageMap: { }, \
    urlMap: { }, \
    collectorID: null, \
    saveTracks: function(page, url, tracks) { \
      url = url.replace("http://", ""); \
      url = url.replace("www.", ""); \
 \
      var tracksMap = { }; \
      for (var i = 0; i < tracks.length; i++) { \
        tracksMap[tracks[i].url] = tracks[i]; \
      } \
 \
      if (typeof(this.urlMap[url]) != "undefined" && typeof(this.urlMap[url].tracks) != "undefined") { \
        for (var aURL in this.urlMap[url].tracks) { \
          tracksMap[aURL] = this.urlMap[url].tracks[aURL]; \
        } \
      } \
 \
      var urls = { }; \
      urls[url] = 1; \
      if (typeof(this.pageMap[page]) != "undefined") { \
        for (var aURL in this.pageMap[page]) { \
          urls[aURL] = 1; \
        } \
      } \
      this.pageMap[page] = urls; \
 \
      var expiry =(new Date()).getTime() + (1000 * 60 * 15); /* in 15 min */ \
      this.urlMap[url] = { tracks: tracksMap, expiry: expiry }; \
      if (this.collectorID === null) { \
        this.collectorID = window.setInterval(this.memoryCollector, 1000 * 60 * 5); /* 5 min */ \
      } \
    }, \
 \
    getTracksForPage: function(page) { \
      if (typeof(this.pageMap[page]) != "undefined") { \
        var toReturn = []; \
        for (var url in this.pageMap[page]) { \
          var tracks = this.getTracksForURL(url); \
          if (tracks !== null && tracks.length > 0) { \
            toReturn = toReturn.concat(tracks); \
          } else { \
            console.error("null for a subURL when getting memoized tracks for a page... should this be possible?"); \
          } \
        } \
        return toReturn; \
      } else { \
        return []; \
      } \
    }, \
 \
    getTracksForURL: function(url) { \
      if (typeof(this.urlMap[url]) != "undefined") { \
        if ((this.urlMap[url].expiry - (new Date()).getTime()) < 0) { \
          delete this.urlMap[url]; \
          return null; \
        } \
        var toReturn = []; \
        for (var trackURL in this.urlMap[url].tracks) { \
          toReturn.push(this.urlMap[url].tracks[trackURL]); \
        } \
        return toReturn; \
      } else { \
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
    dumpTracks: function(tracks) { \
      if (!tracks || tracks.length == 0) { \
        console.log("  >> tracks is null or empty"); \
        return; \
      } \
      for (var i = 0; i < tracks.length; i++) { \
        var track = tracks[i]; \
        console.log("  >> " + track.trackName + " - " + track.artistName); \
      } \
    },\
 \
  }); \
    '
};
