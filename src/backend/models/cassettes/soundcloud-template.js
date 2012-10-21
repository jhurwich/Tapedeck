Tapedeck.Backend.CassetteManager.SoundcloudTemplate = {

  template: ' \
  Tapedeck.Backend.Cassettes.CassetteFromTemplate = Tapedeck.Backend.Models.Cassette.extend({\
    domain : "<%= params.domain %>", \
    defaults : { \
      "name" : "Unnamed", \
      "developer" : "<%= params.entity %>", \
      "developerLink" : "<%= params.domain %>", \
      "defaultFeed" : "Tracks", \
    }, \
    isGroup : <%= params.isGroup %>, \
    entity : "<%= params.entity %>", \
    entityID : "<%= params.entityID %>", \
    consumerKey: "46785bdeaee8ea7f992b1bd8333c4445", \
\
    feeds: { \
      "Tracks": "tracks", \
      <% if (!params.isGroup) { print("\'Favorites\': \'favorites\',") } %> \
    }, \
\
    /* No events, although probably want interval */ \
    events: [], \
\
    getBrowseList: function(context, callback, errCallback) { \
      var self = this; \
      self.getPage(1, context, callback, errCallback); \
    }, /* end getBrowseList */ \
\
    getPage: function(pageNum, context, callback, errCallback) { \
      var self = this; \
      var queryURL = "http://api.soundcloud.com"; \
      if (self.isGroup) { \
        queryURL = queryURL + "/groups"; \
      } else { \
        queryURL = queryURL + "/users"; \
      } \
      var perPageLimit = 20; \
\
      var feedName = self.get("defaultFeed"); \
      if (typeof(context.feed) != "undefined") { \
        feedName = context.feed; \
      } \
      var feed = self.feeds[feedName]; \
\
      queryURL = queryURL + "/" + self.entityID + "/" + feed; \
      queryURL = queryURL + "?format=json&consumer_key=" + self.consumerKey; \
      queryURL = queryURL + "&limit=" + perPageLimit + "&offset=" + ((pageNum-1) * perPageLimit); \
\
      /* Check if we already have the tracks saved for this page */ \
      var foundTracks = self.getTracksForURL(queryURL); \
      if (foundTracks != null && foundTracks.length > 0) { \
        /* Its possible we appropriated another cassettes page, rebrand */ \
        if (foundTracks[0].cassette != self.get("name")) { \
          for (var i = 0; i < foundTracks.length; i++) { \
            foundTracks[i].cassette = self.get("name"); \
          } \
        } \
        callback({ tracks: foundTracks }); \
        return; \
      } \
\
      /* Tracks not found, modify the callback slightly so that the tracks will be saved */ \
      var saveClearAndCallback = function(tracks) { \
        if (typeof(tracks.error) != "undefined") { \
          console.error("Error parsing tracks for " + self.domain + ", page " + pageNum); \
          errCallback(tracks.error); \
        } \
        else { \
          self.saveTracksForURL(queryURL, tracks); \
          callback({ tracks: tracks }); \
        } \
      }; \
\
      Tapedeck.ajax({ \
        type: "GET", \
        url: queryURL, \
        dataType: "json", \
\
        success: self.parseResponse.curry(saveClearAndCallback, queryURL, pageNum, self), \
\
        error: function (response) { \
          console.error("Ajax error retrieving " + self.domain + ", page " + pageNum); \
          errCallback({ message: "CassetteError" }); \
        }, \
      }); \
    }, \
\
    parseResponse: function(callback, url, page, self, response) { \
\
      /* function to convert the json response to our track object form */ \
      var responseToTrack = function(responseTrack) { \
        var track = { type : "soundcloud" }; \
\
        if (typeof(responseTrack.title) != "undefined") { \
          track.trackName = $.trim(responseTrack.title); \
        } \
        if (typeof(responseTrack.user) != "undefined") { \
          track.artistName = $.trim(responseTrack.user.username); \
        } \
        if (typeof(responseTrack.description) != "undefined") { \
          track.description = $.trim(responseTrack.description); \
        } \
\
        if (typeof(responseTrack.stream_url) != "undefined") { \
          track.url = $.trim(responseTrack.stream_url); \
        } \
        else if (typeof(responseTrack.download_url) != "undefined") { \
          track.url = $.trim(responseTrack.download_url); \
        } \
\
        track.domain = location.hostname; \
        track.location = location.href; \
        track.cassette = self.get("name"); \
\
        if (typeof(track.url) != "undefined") { \
          track.url = track.url + "?consumer_key=" + self.consumerKey; \
        } \
        return track; \
      }; /* end responseToTrack */ \
\
      var tracks = []; \
      if (typeof(response.tracks) != "undefined") { \
        /* tracks is an object in the response */ \
        for (var i = 0; i < response.tracks.length; i++) { \
          var rTrack = response.tracks[i]; \
          var newTrack = responseToTrack(rTrack); \
          tracks.push(newTrack); \
        } \
      } \
      else if (typeof(response.length) != "undefined" && response.length > 0) { \
        var response = JSON.parse(response); \
        /* parsing a response containing an array of tracks */ \
        for (var i = 0; i < response.length; i++) { \
          var rTrack = response[i]; \
          var newTrack = responseToTrack(rTrack); \
          tracks.push(newTrack); \
        } \
      } \
      else { \
        /* parsing a response for one track */ \
        var newTrack = responseToTrack(response); \
        tracks.push(newTrack); \
      } \
      callback({ tracks: tracks }); \
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
