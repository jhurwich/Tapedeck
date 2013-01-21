Tapedeck.Backend.Cassettes.HypeM = Tapedeck.Backend.Models.Cassette.extend({
  defaults : {
    "name" : "HypeMachine",
    "developer" : "Jhawk",
    "developerLink" : "www.tape-deck.com"
  },

  // Don't want the interval event
  events: [
    { event  : "pageload",
      do     : "reload" }
  ],
  apiBaseURL: "http://api.hypem.com",
  siteBaseURL: "http://hypem.com",

  /* Track info (http://api.hypem.com/playlist/item/1jsw9/json/1):
        "mediaid": "1jsw9",
        "artist": "Hot Chip",
        "title": "Flutes",
        "dateposted": 1356724819,
        "siteid": 4021,
        "sitename": "Off the Radar",
        "posturl": "http:\/\/www.offtheradarmusic.com\/2012\/12\/off-radars-25-favorite-albums-of-2012.html",
        "postid": 2037114,
        "loved_count": 12033,
        "posted_count": 43,
        "thumb_url": "http:\/\/static-ak.hypem.net\/thumbs_new\/7a\/2037114.png",
        "thumb_url_medium": "http:\/\/static-ak.hypem.net\/thumbs_new\/7a\/2037114_120.png",
        "thumb_url_large": "http:\/\/static-ak.hypem.net\/thumbs_new\/7a\/2037114_320.png",
        "thumb_url_artist": null,
        "time": 425,
        "description": "Another year comes to an end and with it another great collection of albums and amazing music! Which ones will stand the test of time? We shall see, but here are our picks for favorite albums of 2012!! As for the process, it was pretty simple. I just roun",
        "tags": ["electronic", "indie", "electropop", "electronica", "electro"],
        "itunes_link": "http:\/\/hypem.com\/go\/itunes_search\/Hot%20Chip"
  */

  getBrowseList: function(context, callback, errCallback, finalCallback) {
    this.getPage(1, context, callback, errCallback, finalCallback);
  },

  getPage: function(pageNum, context, callback, errCallback, finalCallback) {
    var self = this;
    /*
    <feed> in ['all', 'lastweek', 'noremix', 'remix']
    /playlist/popular/<feed>/json/<page>
    /playlist/popular/all/json/1
    /playlist/popular/lastweek/json/1
    /playlist/popular/noremix/json/1
    /playlist/popular/remix/json/1
    */
    if (typeof(context.feed) == "undefined") {
      context.feed = "all";
    }

    /*
    // first request to the API to get solid metadata
    var apiQueryURL = self.apiBaseURL + "/playlist/popular/" + context.feed + "/json/" + pageNum;
    Tapedeck.ajax({ type: "GET",
                    url: apiQueryURL,
                    dataType: "json",
                    success: self.parsePlaylistAPIResponse,
                    error: function (response) {
                      console.error("Ajax error retrieving " + apiQueryURL);
                      errCallback({ message: "CassetteError" });
                    }
                  });
    */

    // next request the real site to put together a trackURL
    var siteQueryURL = self.siteBaseURL + "/popular/" + context.feed + "/" + pageNum;
    Tapedeck.ajax({ type: "GET",
                    url: siteQueryURL,
                    dataType: "text",
                    success: self.parseHTMLResponse.curry(self, callback, errCallback, finalCallback),
                    error: function (response, status, xhr) {
                      console.error("Ajax error retrieving " + siteQueryURL);
                      errCallback({ message: "CassetteError" });
                    }
                  });
  },

/*
{
    "version": "1.1",
    "0": {
        "mediaid": "1sdbx",
        "artist": "Skrillex",
        "title": "The Reason",
        "dateposted": 1357292642,
        "siteid": 5728,
        "sitename": "Welikeit.indie",
        "posturl": "http:\/\/diary.welikeitindie.com\/post\/39647630929",
        "postid": 2041145,
        "loved_count": 2263,
        "posted_count": 5,
        "thumb_url": "http:\/\/static-ak.hypem.net\/thumbs_new\/39\/2041145.png",
        "thumb_url_medium": "http:\/\/static-ak.hypem.net\/thumbs_new\/39\/2041145_120.png",
        "thumb_url_large": "http:\/\/static-ak.hypem.net\/thumbs_new\/39\/2041145_320.png",
        "thumb_url_artist": null,
        "time": 257,
        "description": "Skrillex surprises fans & haters with new 3-track EP titled, Leaving, & gives it away for free via \u2018The Nest\u2019, a new subscription-based imprint through his own label OWSLA. The Nest functions similarly to a digital fan club & for $12\/month, subscribers wi",
        "itunes_link": "http:\/\/hypem.com\/go\/itunes_search\/Skrillex"
    },
    "1": {
        "mediaid": "1se6g",
        "artist": "Electric Guest",
        "title": "Awake (Dennis Rivera Remix)",
        "dateposted": 1357444863,
        "siteid": 16373,
        "sitename": "Your Music Radar",
        "posturl": "http:\/\/www.yourmusicradar.com\/electric-guest-awake-dennis-rivera-remix\/",
        "postid": 2042464,
        "loved_count": 1275,
        "posted_count": 2,
        "thumb_url": "http:\/\/static-ak.hypem.net\/thumbs_new\/60\/2042464.png",
        "thumb_url_medium": "http:\/\/static-ak.hypem.net\/thumbs_new\/60\/2042464_120.png",
        "thumb_url_large": "http:\/\/static-ak.hypem.net\/thumbs_new\/60\/2042464_320.png",
        "thumb_url_artist": null,
        "time": 396,
        "description": "Big up to Golden Scissors music blog for this gem of a find. Dennis Rivera has remixed \u2018Awake\u2019 by Electric Guest and it\u2019s enough to get your bootie shaking on a Sunday afternoon. An audio delight that you just have to grab a spoon and dig in. Awesome.",
        "itunes_link": "http:\/\/hypem.com\/go\/itunes_search\/Electric%20Guest"
    },
    . . .
*/

  parsePlaylistAPIResponse: function(response) {
    // TODO implement or remove
    console.log(">>> PlaylistAPI got : " + JSON.stringify(response));
  },

  parseHTMLResponse: function(self, callback, errCallback, finalCallback, responseText, textStatus, headers) {

     var openTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*>", "gi");
    };

    var closeTagRegex = function(tag) {
      return new RegExp("<\/" + tag + "[^<>]*>", "gi");
    };

    var openScriptRegex = openTagRegex("script.*id=[\'\"]displayList-data[\'\"]");
    var closeScriptRegex = closeTagRegex("script");

    var openMatch = openScriptRegex.exec(responseText);
    var closeMatch = closeScriptRegex.exec(responseText.substring(openMatch.index));
    var displayListData = JSON.parse(responseText.substring(openMatch.index + openMatch[0].length,
                                                            openMatch.index + closeMatch.index));

    // 1. parse response text for:
    /*
      <script type="application/json" id="displayList-data">
      {
  "page_cur": "\/popular\/all\/1",
  "page_num": "1",
  "page_mode": "all",
  "tracks": [{
    "type": "normal",
    "id": "1se6g",
    "time": 396,
    "ts": {
      "sec": 1357444863,
      "usec": 0
    },
    "postid": 2042464,
    "posturl": "http:\/\/www.yourmusicradar.com\/electric-guest-awake-dennis-rivera-remix\/",
    "fav": 0,
    "key": "85d3b420ae13c02eddf0664a6c02bde7",
    "artist": "Electric Guest",
    "song": "Awake (Dennis Rivera Remix)"
  }, {
    "type": "normal",
    "id": "1sdbx",
    "time": 257,
    "ts": {
      "sec": 1357398868,
      "usec": 0
    },
    "postid": 2042194,
    "posturl": "http:\/\/jayelaudio.com\/2013\/01\/05\/skrillex-leaving-ep\/",
    "fav": 0,
    "key": "f6d2dc37ede11a731077edb05772ccf0",
    "artist": "Skrillex",
    "song": "The Reason"
  }, ...],
  "page_name": "popular",
  "title": "Popular MP3 & Music Blog Tracks \/ The Hype Machine",
  "page_next": "\/popular\/all\/2",
  "show_favorites_friends": true
} < /script>
    */

    var trackDatas = displayListData.tracks;
    var tracks = [];
    for (var i = 0; i < trackDatas.length; i++) {
      var track = self.parseTrackData(trackDatas[i]);
      tracks.push(track);
    }

    // 3. parse response for cookie (a la cookie = response.headers.get('Set-Cookie'))

    // 4. send cookie with ajax request to href (when you want to listen to track, so somehow store cookie and indicate
    // that it's needed... potentially with track type)
    // consider xhrFields in http://api.jquery.com/jQuery.ajax

    callback({ tracks: tracks });
    if (typeof(finalCallback) != "undefined" && finalCallback != null) {
      finalCallback({ success: true });
    }
  },

  parseTrackData: function(trackData) {
    var track = { trackName  : trackData.song,
                  artistName : trackData.artist,
                  type       : "hypem" };

    track.url = this.apiBaseURL + "/serve/play/" + trackData.id + "/" + trackData.key;
    track.domain = this.siteBaseURL;
    track.location = trackData.posturl;
    track.cassette = this.get("name");

    return track;
  },

  errorHandler: function(params, successCallback, errCallback) {
    var self = this;

    var idRegex = new RegExp("serve/play/([^\/]*)/");
    var hypemID = params.track.url.match(idRegex)[1];
    var trackURL = "http://hypem.com/track/" + hypemID;

    var callback = function(parsed) {
      var updatedTrack = null;
      for (var i = 0; i < parsed.tracks.length; i++) {
        if (parsed.tracks[i].url.indexOf(hypemID) != -1) {
          updatedTrack = parsed.tracks[i];
          break;
        }
      }
      successCallback({ track: updatedTrack });
    };

    Tapedeck.ajax({ type: "GET",
                    url: trackURL,
                    dataType: "text",
                    success: self.parseHTMLResponse.curry(self, callback, errCallback, null),
                    error: function (response, status, xhr) {
                      console.error("Ajax error retrieving " + trackURL);
                      errCallback({ message: "CassetteError" });
                    }
                  });
  }
});
