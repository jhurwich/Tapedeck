// Props to Dan Kantor @ ExFM for providing a great song-parser template
// that this implementation was based off of.
var onObject = null;
if (typeof(TapedeckInjected) != "undefined") {
  onObject = TapedeckInjected;
}
else if (typeof(Tapedeck) != "undefined" &&
         typeof(Tapedeck.Backend) != "undefined") {
  onObject = Tapedeck.Backend;
}

if (onObject != null &&
    (typeof(onObject.TrackParser) == "undefined" ||
     !onObject.TrackParser.isParsing)) {

  onObject.TrackParser = {
    DEBUG_LEVELS: {
      NONE  : 0,
      BASIC : 1,
      ALL   : 2,
    },
    debug: 0,

    moreCallback: null,
    finalCallback: null,
    context: null,
    isParsing: false,
    onBackgroundPage: false,
    cassetteName: "",
    start : function(params) {
      if (typeof(params) == "undefined") {
        params = { };
      }
      var parser = onObject.TrackParser;

      if (typeof(params.cassetteName) != "undefined") {
        parser.cassetteName = params.cassetteName;
      }
      else {
        parser.cassetteName = "";
      }

      // Check if we have a callback, and are thus on the bkgrd page.
      // If so, save the add more callback too, otherwise use sendRequest
      // because we're not on the bkgrd page.
      if (typeof(params.callback) != "undefined") {
        parser.onBackgroundPage = true;
      }
      if (parser.onBackgroundPage &&
          typeof(params.moreCallback) != "undefined") {
        parser.moreCallback = params.moreCallback;
      }
      else {
        parser.moreCallback = function(tracks) {
          var request = {
            action: "add_tracks",
            tracks: tracks,
          };
          chrome.extension.sendRequest(request);
        };
      }

      if (typeof(params.finalCallback) != "undefined") {
        parser.finalCallback = params.finalCallback;
      }

      if (typeof(params.context) == "undefined") {
        parser.context = document;
      }
      else {
        parser.context = params.context;
      }

      parser.isParsing = true;
      parser.log("starting parsing", parser.DEBUG_LEVELS.BASIC);

      // try to get songs, catch any parser fails
      try {
        var tracks = parser.findSongs();
        parser.log("ending parsing - got tracks: " + JSON.stringify(tracks), parser.DEBUG_LEVELS.BASIC);

        if (!parser.onBackgroundPage) {
          var response = {
            type: "response",
            tracks: tracks
          };
          chrome.extension.sendRequest(response);
        }
        else {
          params.callback(tracks);
        }
        if (!parser.isParsing && parser.finalCallback != null) {
          parser.finalCallback({}); //
        }
      }
      catch (e) {
        console.err("ParserError")
        if (!parser.onBackgroundPage) {
          var response = {
            type: "response",
            error: { message: "ParserError" },
          };
          chrome.extension.sendRequest(response);
          if (parser.finalCallback != null) {
            parser.finalCallback({ error: "ParserError" });
          }
        }
        else {
          params.callback({ error: "ParserError" });
          if (parser.finalCallback != null) {
            parser.finalCallback({ error: "ParserError" });
          }
        }
      }

    },

    findSongs : function() {
      var parser = onObject.TrackParser;

      //  Each scrape returns a map of url => track objects.
      //  This allows us to merge, preventing url duplicates and
      //  preserving the tracks relative order.

      var resultObjects = [];
      // ================ Synchronous Scrapes ================
      // Scrape Tumblr
      if ($("#tumblr_controls", parser.context).length > 0 ||
          parser.forceTumblr) {
        resultObjects.push(parser.Tumblr.scrape());
      }

      // Scrape TumblrDashboard
      if (location.href.indexOf('tumblr.com/dashboard') != -1 ||
          parser.forceTumblrDashboard) {
        resultObjects.push(parser.TumblrDashboard.scrape());
      }

      // Scrape mp3 Links
      resultObjects.push(parser.Links.scrape());

      // Scrape <audio> elements
      resultObjects.push(parser.AudioElements.scrape());

      // Scrape flash players of WordPress's form
      resultObjects.push(parser.WPFlashPlayers.scrape());

      // ================ Async Scrapes ================
      //Scrape Soundcloud
      var parsingSoundcloud = parser.Soundcloud.scrape(); // will be true if special soundcloud parsing is happening

      var toReturn = parser.mergeResults(resultObjects);

      parser.isParsing = parsingSoundcloud;
      return toReturn;
    },

    mergeResults : function(resultObjects) {
      var parser = onObject.TrackParser;

      var resultMap = { };

      // We merge in from the end so that we end up with the first
      // object that we found with the same url.
      for (var i = resultObjects.length - 1; i >= 0; i--) {
        $.extend(resultMap, resultObjects[i]);
      }

      var tracks = [];
      for (var url in resultMap) {
        var track  = resultMap[url];
        track.cassette = parser.cassetteName;
        tracks.push(parser.cleanTrack(track));
      }
      return tracks;
    },

    cleanTrack : function(track) {
      // Sometimes artist names are concatted to trackName,
      // if we have the trackName but no artist try to figure it out
      if (track.trackName &&
          track.trackName.length > 0 &&
          (!track.artistName || track.artistName.length == 0)) {

        // if the trackName has only one dash or hypen, split on it
        var pieces = track.trackName.split("–");
        if (pieces.length < 2) {
          pieces = track.trackName.split("-");
        }
        if (pieces.length == 2) {
          track.artistName = pieces[0];
          track.trackName = pieces[1];
        }
      }
      return track;
    },

    Links : {
      scrape : function() {
        var parser = onObject.TrackParser;

        var links = $('a', parser.context);
        var mp3Links = { };
        for (var i = 0; i < links.length; i++) {
          var a = links[i];
          var href = a.href;
          var extension = href.substr(href.lastIndexOf('.'), 4);

          // If Yahoo Media Player is installed we could double count tracks
          if ($(a).hasClass('ymp-tray-track') == true) {
            continue;
          }

          if (extension == '.mp3') {
            var track = { type : "mp3" };
            var text = $(a).text();


            track = parser.Util.addArtistAndTrackNames(track, text);

            if (track.trackName == "") {
              var splitHref = a.href.split(extension)[0];
              var filename = unescape(splitHref.substr
                                               (splitHref.lastIndexOf('/')+1));
              if (filename != '') {
                track.trackName = filename;
              } else {
                parser.log("No trackName found for '" + a.href + "'. Using 'Unknown Title'",
                         parser.DEBUG_LEVELS.BASIC);
              }
            }

            track.url = a.href;
            track.location = location.href;
            track.domain = location.hostname;

            var wpParentPost = $(a).parents('div.post');
            if (wpParentPost.length > 0) {
              var wpBookmark = $(wpParentPost).find("a[rel='bookmark']");
              if (wpBookmark.length > 0) {
                track.location = $(wpBookmark).attr('href');
              }
              var wpParentEntry = $(wpParentPost).children('div.entry');
              if (wpParentEntry.length == 0) {
                wpParentEntry = $(wpParentPost).children('div.entry-content');
              }

              var longestEntry = "";
              $(wpParentEntry).children("p").each(function(index, p) {
                var entry = parser.Util.cleanHTML($(p).html());
                if (entry.length > longestEntry.length) {
                  longestEntry = entry;
                }
              });

              track.description = parser.Util.trimString(longestEntry, 200);
            }
            if (parser.debug) {
              parser.log("new track object: " + JSON.stringify(track),
                       parser.DEBUG_LEVELS.ALL);
            }

            mp3Links[track.url] = track;
          }
        }
        return mp3Links;
      },
    }, // end parser.Links

    TumblrDashboard : {
      /* jhawk Save for later
      loadMore : function(){
          var mp3Links = parser.tumblrDasboard.scrape();
          if (mp3Links.length > 0){
              var o = {"msg" : "pageSongsMore", "sessionKey" : parser.SessionKey, "data" : mp3Links};
              parser.Comm.send(o);
          }
      },
      */
      scrape : function() {
        var parser = onObject.TrackParser;

        var mp3Links = { };
        var urls = [];
        var lis = $('li.audio', parser.context);
        for (var i = 0; i < lis.length; i++) {
          try {
            var li = lis[i];
            var track = { type : "mp3" };
            var embed = $(li).find('embed')[0];

            track.url = $(embed).attr("src")
                               .split('audio_file=')[1]
                               .split('&color=')[0];
            track.location = location.href;

            if ($.inArray(track.url, urls) != -1) {
              // already seen this track
              parser.log("already scraped " + track.url, parser.DEBUG_LEVELS.BASIC);
              continue;
            }

            urls.push(track.url);

            var postBody = $(li).find('.post_body').first();
            var post = parser.Util.cleanHTML(postBody.html());

            var albumArts = jQuery(li).find('.album_art');
            if (albumArts.length > 0) {
              var albumArt = albumArts[0];
              var titlePieces = $(albumArt).attr('title').split(' - ');
              track.artistName = $.trim(titlePieces[0]);
              track.trackName = $.trim(titlePieces[1]);
            }
            else {
              track.trackName = parser.Util.trimString(post, 200);
            }
            track.description = parser.Util.trimString(post, 200);

            var perma = $(li).find('a.permalink').first();
            if (perma) {
              track.location = perma.attr("href");
            }
            else {
              track.location = location.href;
            }
            track.domain = location.hostname;

            mp3Links[track.url] = track;
          }
          catch(e) {
            parser.log("Error in TumblrDashboard scraping",
                     parser.DEBUG_LEVELS.NONE);
          }
        }
        return mp3Links;
      }
    }, // End this.TumblrDashboard

    Tumblr: {
        /* Save for loadMore
        response : function(json){
            clearTimeout(this.tumblrAPI.timeout);
            try {
                var str = json.substr(22);
                str = str.substr(0, str.length - 2);
                var obj = JSON.parse(str);
                var total = obj['posts-total'];
                var mp3Links = [];
                for (var i = 0; i < obj.posts.length; i++){
                    var item = obj.posts[i];
                    var src = item['audio-player'].split('audio_file=');
                    var file = src[1].split('&color=');
                    var trackVO = new TrackVO();
                    var url = file[0]+'?plead=please-dont-download-this-or-our-lawyers-wont-let-us-host-audio';
                    trackVO.url = url;
                    if (trackVO.tracktitle == "" || trackVO.tracktitle == undefined){
                        trackVO.tracktitle = "Unknown Title";
                    }
                    trackVO.tracktitle = Utils.trimString(item['audio-caption'].replace(/(<([^>]+)>)/ig,""), 200);
                    trackVO.description = Utils.trimString(item['audio-caption'].replace(/(<([^>]+)>)/ig,""), 200);
                    var href = item['url-with-slug'];
                    trackVO.href = href;
                    trackVO.key = hex_md5(url);
                    if (obj.tumblelog.cname) {
                        trackVO.domain = obj.tumblelog.cname;
                    } else {
                        trackVO.domain = obj.tumblelog.name+".tumblr.com";
                    }
                    trackVO.domainkey = hex_md5(trackVO.domain+url);
                    trackVO.publishdate = item['unix-timestamp'] * 1000;
                    mp3Links.push(trackVO);
                }
                if (mp3Links.length > 0){
                    var o = {"msg" : "pageSongsMore", "sessionKey" : this.SessionKey, "data" : mp3Links};
                    this.Comm.send(o);
                }
            } catch(e){}
            this.tumblrAPI.scrape();
        },
        */
      scrape : function() {
        var parser = onObject.TrackParser;

        var mp3Links = { };
        var divs = $('div.audio_player', parser.context);
        for (var i = 0; i < divs.length; i++) {
          try {
            var div = divs[i];
            var track = { type: "mp3" };
            var embed = $(div).find('embed').first();

            var src = $(embed).attr('src');
            track.url = src.split("?audio_file=")[1].split("&")[0];

            track.domain = location.hostname;
            track.location = location.href;

            /*  jhawk track is lacking
             *    trackName
             *    artistName
             */

            mp3Links[track.url] = track;
          }
          catch(e) {
            parser.log("Error in Tumblr scraping",
                     parser.DEBUG_LEVELS.NONE);
          }
        }
        /* jhawk save for loadmore
        if (mp3Links.length > 0){
          var obj = {"msg" : "pageSongsMore", "sessionKey" : parser.SessionKey, "data" : mp3Links};
          parser.Comm.send(obj);
        }
        */
        return mp3Links;
      }
    }, // End parser.Tumblr

    AudioElements : {
      scrape : function() {
        var parser = onObject.TrackParser;

        var audioElements = $('audio', parser.context);
        var mp3Links = { };
        for (var i = 0; i < audioElements.length; i++) {
          var audio = audioElements[i];
          var track = { type: "mp3" };

          var src = audio.src;
          if (typeof(src) == "undefined" || src == "") {
            var sources = $(audio).children("source");
            if (sources != null && sources.length > 0) {
              sources.each(function (index, source) {
                var sourceSrc = $(source).attr("src");
                if (typeof(sourceSrc) != "undefined"
                    && sourceSrc.match(/.mp3/).length > 0) {
                  src = sourceSrc;
                }
              });
            }
          }

          if (src != undefined && src != "") {
            track.url = src;
            track.location = location.href;
            track.domain = location.hostname;

            /*  jhawk track is lacking
             *    trackName
             *    artistName
             */

            mp3Links[track.url] = track;
          } else {
            parser.log('<audio> must have src or <source>',
                     parser.DEBUG_LEVELS.BASIC);
          }

        }
        return mp3Links;
      }
    }, // end parser.AudioElements

    WPFlashPlayers : {
      scrape : function() {
        // We understand how both WordPress's flashplayer and our
        // own <td-object>s that mimic WordPress's flashplayer inflation
        var parser = onObject.TrackParser;
        var flashPlayers = $("object[type='application/x-shockwave-flash']",
                             parser.context);
        $.merge(flashPlayers, $("td-object"));

        var trackMap = { };
        flashPlayers.each( function(index, player) {

          var fileURL = "";
          if (player.tagName == "OBJECT") {
            var params = $(player).children('param');

            params.each( function(index, param) {
              var paramName = $(param).attr("name").toLowerCase();
              if (paramName == "flashvars") {
                var val = $(param).attr("value");
                var matches = val.match(/soundFile=(.*?)&/);
                if (matches == null) {
                  matches = val.match(/soundFile=(.*?)/);
                }

                if (matches != null && matches.length > 1) {
                  fileURL = decodeURIComponent(matches[1]);
                  return;
                }
              }
            }); // end params.each
          }
          else if (player.tagName == "TD-OBJECT") {
            fileURL = decodeURIComponent($(player).attr("url"));
          }

          if (fileURL.length > 0) {

            var track = { type      : "mp3",
                          url       : fileURL,
                          location  : location.href,
                          domain    : location.hostname };

            // Looks like flashplayers of this style are wordpress,
            // a <p> with class="audioplayer_container is the root
            // of the player, but the trackName could be before or after
            var audioContainer = $(player).parents
                                          (".audioplayer_container")
                                          .first();

            var pBefore = $(audioContainer).prevAll("p").last();
            if (pBefore != null &&
                !$(pBefore).hasClass("scraped") &&
                $(pBefore).html().length > 0) {
              var beforeEntry = parser.Util.cleanHTML($(pBefore).html());
              parser.Util.addArtistAndTrackNames(track, beforeEntry);
            }

            if (typeof(track.artistName) != "undefined" &&
                track.artistName.length > 0) {
              // That gave us a full track, mark the entry as used
              $(pBefore).addClass("scraped");
            }
            else {
              // Incomplete track, try the entry after
              var pAfter = $(audioContainer).nextAll("p").first();
              if (pAfter != null &&
                  !$(pAfter).hasClass("scraped") &&
                  $(pAfter).html().length > 0) {
                var afterEntry = parser.Util.cleanHTML($(pAfter).html());
                parser.Util.addArtistAndTrackNames(track, afterEntry);
              }

              if (typeof(track.artistName) == "undefined" ||
                  track.artistName.length > 0) {
                // That gave us a full track, mark the entry as used
                $(pAfter).addClass("scraped");
              }
            }

            // As a last resort, use the filename
            if (typeof(track.trackName) == "undefined" || track.trackName.length == 0) {
              var lastSlash = fileURL.lastIndexOf('/');
              track.trackName = fileURL.substring(lastSlash + 1);
            }
            trackMap[track.url] = track;
          }
        }); // end flashPlayers.each

        return trackMap;
      }
    }, // end parser.WPFlashPlayers


    Soundcloud : {
      objectCount : 0,
      consumerKey: "46785bdeaee8ea7f992b1bd8333c4445",

      // returns true if soundcloud parsing is necessary, false otherwise
      scrape : function() {
        var parser = onObject.TrackParser;

        var soundcloud = parser.Soundcloud;

        // first see if we are parsing a Soundcloud user page,
        // if so use their API instead
        var url = parser.Util.getCurrentURL();
        if (url.indexOf('soundcloud.com') != -1) {
          soundcloud.parseWithAPI(url);
          return true;
        }

        var foundThingsToParse = false;
        soundcloud.objectCount = 0;

        var objects = $('object', parser.context);

        objects.each( function(index, object) {
          var params = $(object).children('param');
          var swfValue = "";

          params.each(function(index, param) {
            var paramName = $(param).attr("name").toLowerCase();
            if (paramName == "movie" ||
                paramName == "src" ||
                paramName == "data") {
              if (swfValue.length > 0) {
                parser.log("Got multiple src's for one object! (" +
                         swfValue + ", " + param.attr("value") + ")");
              }

              swfValue = $(param).attr("value");
            }
            else if (paramName != "allowscriptaccess") {
              parser.log("Unrecognized param name " + paramName);
            }
          }); // end params.each

          if (swfValue.length == 0) {
            parser.log("Couldn't find url param in Soundcloud object");
            soundcloud.objectCount--;
            return;
          }

          foundThingsToParse = true;
          soundcloud.objectCount++;

          soundcloud.findURLAndQuery(swfValue);
        }); // end objects.each

        var iframes = $('iframe', parser.context);
        iframes.each(function(index, iframe) {
          var src = $(iframe).attr("src");

          if (src != null &&
              src.match(/api.soundcloud.com/) != null) {
            soundcloud.objectCount++;
            foundThingsToParse = true;
            soundcloud.findURLAndQuery(src);
          }

        }); // end iframes.each

        return foundThingsToParse;
      },

      findURLAndQuery : function(str) {
        var parser = onObject.TrackParser;
        var soundcloud = parser.Soundcloud;

        var matches = str.match(/\?url=(.*?)&/);
        if (matches == null) {
          // possible there were just no other params
          matches = str.match(/\?url=(.*)/)
        }

        if (matches != null && matches.length > 1) {
          var queryURL = decodeURIComponent(matches[1]);

          queryURL += "?format=json&consumer_key=";
          queryURL += soundcloud.consumerKey;

          parser.log("sending request to " + queryURL);
          $.ajax({
            type: "GET",
            url: queryURL,
            dataType: "json",

            success: soundcloud.parseJSONResponse,

            error: function (response) {
              console.error("Ajax error retrieving '" + queryURL + "'");
            },
          });
        }
        else {
          parser.log("Counldn't locate a url for Soundcloud object");
        }
      },

      parseWithAPI: function(url) {
        var parser = onObject.TrackParser;
        var soundcloud = parser.Soundcloud;
        url = url.replace("http://", "");
        url = url.replace("https://", "");
        url = url.replace("www.", "");

        parser.log("defering to Soundcloud API: " + url);

        var queryURL = "";
        if (url.indexOf('groups') != -1) {
          // parsing a group page
          var icons = $(parser.context).find('.icons-group').first();
          var wordURL = $(icons).find('a.wordpress').first().attr("href");
          var scURL = wordURL.match(/soundcloud url=["']([^"']*)["']/)[1];
          var groupID = scURL.match(/api.soundcloud.com\/groups\/(\d*)/)[1];

          queryURL = 'https://api.soundcloud.com/groups/' + groupID + '/tracks';
        }
        else if (url.indexOf('/you/') != -1) {
          // parsing the current user's page requires OAuth and
          // is not supported yet
          return;
        }
        else {
          // parsing another user's page
          var firstSlash = url.indexOf('/');
          var nextSlash = url.indexOf('/', firstSlash + 1);
          var user = (nextSlash != -1) ? url.substring(firstSlash + 1, nextSlash) :
                                         url.substring(firstSlash + 1);
          queryURL = 'https://api.soundcloud.com/users/' + user + '/tracks';
        }
        queryURL += "?format=json&consumer_key=" + soundcloud.consumerKey;

        parser.log("sending request to " + queryURL);
        $.ajax({
          type: "GET",
          url: queryURL,
          dataType: "json",

          success: soundcloud.parseJSONResponse,

          error: function (response) {
            console.error("Ajax error retrieving '" + queryURL + "'");
          },
        });
      },

      parseJSONResponse : function(response) {
        var parser = onObject.TrackParser;
        var soundcloud = parser.Soundcloud;

        var responseToTrack = function(responseTrack) {
          var track = { type : "soundcloud",
                        cassette : "Scraper" };

          if (typeof(responseTrack.title) != "undefined") {
            track.trackName = $.trim(responseTrack.title);
          }
          if (typeof(responseTrack.user) != "undefined") {
            track.artistName = $.trim(responseTrack.user.username);
          }
          if (typeof(responseTrack.description) != "undefined") {
            track.description = $.trim(responseTrack.description);
          }

          if (typeof(responseTrack.stream_url) != "undefined") {
            track.url = $.trim(responseTrack.stream_url);
          }
          else if (typeof(responseTrack.download_url) != "undefined") {
            track.url = $.trim(responseTrack.download_url);
          }

          track.domain = location.hostname;
          track.location = location.href;
          track.cassette = parser.cassetteName;

          if (typeof(track.url) != "undefined") {
            track.url = track.url +
                        "?consumer_key=" +
                        soundcloud.consumerKey
          }

          parser.log("built track " + JSON.stringify(track));
          return track;
        };

        var tracks = [];
        if (typeof(response.tracks) != "undefined") {

          for (var i = 0; i < response.tracks.length; i++) {
            var rTrack = response.tracks[i];
            var newTrack = responseToTrack(rTrack);
            tracks.push(newTrack);
            soundcloud.objectCount--;
          }
        }
        else if (typeof(response.length) != "undefined" &&
                 response.length > 0) {
          // parsing a response containing an array of tracks
          for (var i = 0; i < response.length; i++) {
            var rTrack = response[i];
            var newTrack = responseToTrack(rTrack);
            tracks.push(newTrack);
            soundcloud.objectCount--;
          }
        }
        else {
          // parsing a response for one track
          var newTrack = responseToTrack(response);
          tracks.push(newTrack);
          soundcloud.objectCount--;
        }

        parser.log("adding Soundcloud tracks: " + JSON.stringify(tracks));
        parser.moreCallback(tracks);

        if (soundcloud.objectCount == 0 && parser.finalCallback != null) {
          parser.finalCallback({});
        }
      },
    }, // end parser.Soundcloud

    Util: {
      removeUnwantedTags: function(text) {
        var openTagRegex = function(tag) {
          return new RegExp("<\s*" + tag + "[^<>]*>");
        }

        var closeTagRegex = function(tag) {
          return new RegExp("<\/" + tag + "[^<>]*>", "i");
        }

        var selfClosedTagRegex = function(tag) {
          return new RegExp("<\s*" + tag + "[^<>]*\/>", "i");
        }

        var unwantedBlocks = ["head", "meta", "script", "noscript"]; // remove these tags and everything that may be in them
        for (var i = 0; i < unwantedBlocks.length; i++) {
          var tag = unwantedBlocks[i];

          // we don't want the tags as blocks or as self closed tags
          var selfCloseMatch = null;
          while ((selfCloseMatch = text.match(selfClosedTagRegex(tag))) != null) {
            text = text.replace(selfCloseMatch[0], "");
          }

          var openPos = -1;
          var closeMatch = null;
          while ((openPos = text.search(openTagRegex(tag))) != -1) {
            if ((closeMatch = text.match(closeTagRegex(tag))) != null) {
              var closeLen = closeMatch[0].length;
              var toRemove = text.substring(openPos, closeMatch.index + closeLen);
              text = text.replace(toRemove, "");
            }
            else {
              // couldn't find a close tag, just remove the open tag
              console.error("no close tag for open tag '" + tag + "'");
              text = text.replace(text.match(openTagRegex(tag))[0], "");
            }

          }
        }

        var unwantedTags = ["html", "body", "!DOCTYPE"]; // only remove these tags themselves, not their contents
        for (var i = 0; i < unwantedTags.length; i++) {
          var tag = unwantedTags[i];

          var match = null;
          while ((match = text.match(openTagRegex(tag))) != null) {
            text = text.replace(match[0], "");
          }
          while ((match = text.match(closeTagRegex(tag))) != null) {
            text = text.replace(match[0], "");
          }
          while ((match = text.match(selfClosedTagRegex(tag))) != null) {
            text = text.replace(match[0], "");
          }
        }

        return text;
      },

      inflateWPFlashObjects: function(text) {
        // first find the inflation data that we need
        var embedRegex = new RegExp('AudioPlayer\.embed.\s*[\'\"]([^\'\"]*)[\'\"]\s*?,.*soundFile\s*:\s*[\'\"]([^\'\"]*)[\'\"]', 'g');
        var match = embedRegex.exec(text);
        if (!match) {
          return text;
        }

        var inflations = [ ];
        while (match) {
          inflations.push({ id: match[1], url: match[2] });
          match = embedRegex.exec(text);
        }

        // use the inflation data to inject extra info at the right place
        for (var i = 0; i < inflations.length; i++) {
          // find the tag with the id for the inflation
          var tagRegex = new RegExp('<([^<>]*?)id=[\"\']?' + inflations[i].id + '[\"\']?([^<>]*?)>', 'g');
          var tagMatch = tagRegex.exec(text);
          if (tagMatch) {
            // inject our tag right before the tag with that id
            var index = tagRegex.lastIndex - tagMatch[0].length;
            text = text.substr(0, index) +
                   "<td-object url='" + inflations[i].url + "'></td-object>" +
                   text.substr(index);
          }
        }
        return text;
      },

      trimString : function(str, length) {
        if (str.length > length) {
            str = str.substr(0, length) + '...';
        }
        return str;
      },

      cleanHTML : function(html) {
        return $.trim(html.replace(/(<([^>]+)>)/ig,""))
      },

      cleanHref : function(href) {
        var str = href.replace("http://", "");
        str = str.replace(/www./, "");

        var lastSlash = str.indexOf("/");
        while (lastSlash == 0) {
          str = str.substr(0);
          lastSlash = str.indexOf("/");
        }

        if (lastSlash != -1) {
          str = str.substr(0, lastSlash-1);
        }

        return str;
      },

      // Attempt to add artist and track name to the param track by
      // splitting text in two.  If text cannot be split, the param
      // track's trackName will be set to text.
      addArtistAndTrackNames : function(track, text) {
        var commonSplitUnicodes = [124,  // vertical bar
                                   126,  // tilde
                                   8208, // hyphen
                                   8209, // non-breaking hyphen
                                   8210, // figure dash
                                   8211, // en dash
                                   8212, // em dash
                                   8213, // horizontal bar
                                   58,   // colon
                                   45];  // hyphen-minus

        var bestSplit = [];

        // We define a better split as one for which the difference in
        // length of track and artist name is a minimum
        var isBetterSplit = function(checkPieces) {
          // "And you will know us by the trail of dead." is the
          // longest band name we support with 9 spaces.
          // Anything with more is invalid.
          if (checkPieces[0].split(" ").length > 10 ||
              checkPieces[1].split(" ").length > 10) {
            return false;
          }

          if (bestSplit.length == 0) {
            return true;
          }

          var checkSplitDiff = Math.abs(checkPieces[0].length - checkPieces[1].length);
          var bestSplitDiff = Math.abs(bestSplit[0].length - bestSplit[1].length);

          return (checkSplitDiff < bestSplitDiff);
        }

        // Try each common splitter to find which gives the best 2 pieces,
        // if any.  First piece is set to artistName and second to trackName
        // if there is a split, else trackName is set to the param text.

        // First we try all of our splitters with spaces on either side,
        // then if we can't find anything we try without spaces.
        for (var i = 0; i < commonSplitUnicodes.length; i++) {
          var unicode = commonSplitUnicodes[i];

          // with spaces on either side of the splitter
          var pieces = text.split(" " + String.fromCharCode(unicode) + " ", 2);

          if (pieces.length > 1 &&
              isBetterSplit(pieces)) {
            bestSplit = pieces;
          }
        }
        if (bestSplit.length < 2) {
          for (var i = 0; i < commonSplitUnicodes.length; i++) {
            var unicode = commonSplitUnicodes[i];

            // without spaces around the splitter
            var pieces = text.split(String.fromCharCode(unicode), 2);

            if (pieces.length > 1 &&
                isBetterSplit(pieces)) {
              bestSplit = pieces;
            }
          }
        }

        if (bestSplit.length > 1) {
          // things like angled quote marks only seem to work through codes
          var unwantedCharCodes = [8220, 8221, 8242, 8243];
          var unwantedStr = "";
          for (var i = 0; i < unwantedCharCodes.length; i++) {
            unwantedStr = unwantedStr + String.fromCharCode(unwantedCharCodes[i]);
          }

          track.artistName = $.trim(bestSplit[0]).replace(/[‘’“”'"]/g, "");
          track.artistName = track.artistName.replace(new RegExp("[" + unwantedStr + "]", "g"), "");

          track.trackName = $.trim(bestSplit[1]).replace(/[‘’“”'"]/g, "");;
          track.trackName = track.trackName.replace(new RegExp("[" + unwantedStr + "]", "g"), "");
        }
        else if (text.length < 100 && text.split(" ") < 10) {
          // If we get this far, we could just have a short trackName
          // that we're considering.  We check that's the case heuristically.
          track.trackName = $.trim(text);
        }

        return track;
      },

      getCurrentURL: function() {
        var parser = onObject.TrackParser;
        var url = null;
        if (typeof(parser.context.location) == "undefined") {
          // context is not a document
          url = $(parser.context).attr("url");
        }
        else {
          url = parser.context.location.href;
        }
        return url;
      },
    },

    log: function(str, level) {
      var parser = onObject.TrackParser;
      if (parser.debug == parser.DEBUG_LEVELS.NONE) {
        return;
      }
      if (typeof(level) == "undefined") {
        level = parser.DEBUG_LEVELS.BASIC;
      }
      if (parser.debug >= level) {
        var currentTime = new Date();
        console.log("TrackParser (" + currentTime.getTime() + ") - " + str);
      }
    }
  };

  if (typeof(TapedeckInjected) != "undefined" &&
      !TapedeckInjected.isTest()) {

    // Scraper is the trackparser on a webpage
    onObject.TrackParser.start({ cassetteName: "Scraper" });
  }

}
