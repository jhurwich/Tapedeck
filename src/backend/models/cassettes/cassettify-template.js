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
      self.callback = callback; \
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
        self.callback({ tracks: foundTracks, stillParsing: false }); \
        self.finalCallback({ success: true }); \
        return; \
      } \
 \
      if (!self.isDumpCached(pageNum, pageURL)) { \
        self.parsePage(self, pageNum, pageURL, true, self.callback); \
      } \
      else { \
        /* the dump for this cassette is cached and non-stale */ \
        var ourDump = $("#dump").find("#CassetteFromTemplate"); \
        var pageDump = $(ourDump).find("#page" + pageNum); \
        var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(url) + "\']"); \
 \
        /* TODO make sure this respects that a page can have multiple URL dumps */ \
 \
        Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                             context      : $(urlDump), \
                                             callback     : self.postScrapeCallback.curry(pageNum, url, [], self.callback), \
                                             moreCallback : self.addMoreCallback.curry(self, pageNum, pageURL), \
                                             finalCallback: self.finish.curry(self) }); \
      } \
    }, \
 \
    /* all params are mandatory - doParseSubPages indicates if subPages should be queried and parsed */ \
    parsePage: function(self, page, url, doParseSubPages, callback) { \
      console.log("ParsePage page: " + page + " - url: " + url + " - doSubs?: " + doParseSubPages); \
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
        var cleanedText = Tapedeck.Backend.TrackParser.Util.inflateWPFlashObjects(responseText); \
        cleanedText = Tapedeck.Backend.TrackParser.Util.removeUnwantedTags(cleanedText); \
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
         *   5. make sure you save the urls and tracks so they are memoized (and perhaps fix a bug in there) */ \
 \
        Tapedeck.Backend.TrackParser.start({ cassetteName : self.get("name"), \
                                             context      : $(urlDump), \
                                             callback     : self.postScrapeCallback.curry(self, page, url, subURLs, self.callback), \
                                             moreCallback : self.addMoreCallback.curry(self, page, url), \
                                             finalCallback: self.finish.curry(self) }); \
      }; /* end handleResponse */ \
 \
      Tapedeck.ajax({ \
        type: "GET", \
        url: "http://www." + url, \
        dataType: "html", \
 \
        success: handleResponse, \
 \
        error: function (response) { \
          console.error("Ajax error retrieving " + self.domain + ", page " + pageNum); \
          self.errCallback({ message: "CassetteError" }); \
        }, \
      }); \
    }, \
 \
    postScrapeCallback: function(self, page, topURL, subURLs, callback, params) { \
      console.log("PostScrape page: " + page + " - url: " + topURL + " - subURLs: " + JSON.stringify(subURLs)); \
      console.log("           params: " + JSON.stringify(params)); \
      if (typeof(params.error) != "undefined") { \
        console.error("Error parsing tracks for " + self.domain + ", page " + page); \
        self.errCallback(params.error); \
        return; \
      } \
 \
      var expectedCallbacks = subURLs.length; \
 \
      /* memoize the tracks for the url, once done we no longer need the dump for that url */ \
      var tryFinish = function() { \
        self.saveTracksForURL(topURL, params.tracks); /* TODO ensure that saving tracks for subURLs is alright and working properly */ \
        console.log("Trying to finish for page: " + page + " - url: " + topURL); \
        if (expectedCallbacks.length <= 0) { \
          var ourDump = $("#dump").find("#CassetteFromTemplate"); \
          var pageDump = $(ourDump).find("#page" + page); \
          var urlDump = $(pageDump).find(".url[url=\'" + encodeURIComponent(topURL) + "\']"); \
          urlDump.remove(); \
          console.log("    Calling back - Dumps remaining for page " + page + ": " + pageDump.children().length); \
 \
          callback(params); \
        } \
      }; \
 \
      while(subURLs.length > 0) { \
        var subURL = subURLs.shift(); \
        self.parsePage(self, page, subURL, false, function(aParams) { \
          /* completed parsing subPage */ \
          expectedCallbacks = expectedCallbacks - 1; \
 \
          if (typeof(params.error) != "undefined") { \
            console.error("Error parsing tracks for " + self.domain + ", page " + page + ", subURL " + subURL); \
          } \
          else { \
            params.tracks = params.tracks.concat(aParams.tracks); \
          } \
 \
          tryFinish(); \
        }); \
      } \
      tryFinish(params); \
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
