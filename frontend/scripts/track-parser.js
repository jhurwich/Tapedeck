// Props to Dan Kantor @ ExFM for providing a great song-parser template
// that this implementation was based off of.
EinInjected.TrackParser = {
  debug : false,

  start : function() {
    var tracks = EinInjected.TrackParser.findSongs();

    var response = {
      type: "response",
      tracks: tracks
    }
    chrome.extension.sendRequest(response);
  },
  
  findSongs : function() {
    //  Each scrape returns a map of url => track objects.
    //  This allows us to merge, preventing url duplicates and
    //  preserving the tracks relative order.
    
    var resultObjects = [];
    if ($("#tumblr_controls").length > 0 ||
        EinInjected.TrackParser.forceTumblr) {
      resultObjects.push(EinInjected.TrackParser.tumblr.scrape());
    }
    
    if (location.href.indexOf('tumblr.com/dashboard') != -1 ||
        EinInjected.TrackParser.forceTumblrDashboard) {
      resultObjects.push(EinInjected.TrackParser.tumblrDashboard.scrape());
    }
    
    resultObjects.push(EinInjected.TrackParser.links.scrape());
    
    resultObjects.push(EinInjected.TrackParser.audioElements.scrape());
    
    return EinInjected.TrackParser.mergeResults(resultObjects);
  },

  mergeResults : function(resultObjects) {
    var resultMap = { };

    // We merge in from the end so that we end up with the first
    // object that we found with the same url.
    for (var i = resultObjects.length - 1; i >= 0; i--) {
      $.extend(resultMap, resultObjects[i]);
    }

    var tracks = [];
    for (var url in resultMap) {
      var track  = resultMap[url];
      tracks.push(this.cleanTrack(track));
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

  links : {
    scrape : function() {
      var links = $('a');
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
          var pieces = text.split("-", 2);
          if (pieces.length > 1) {
            track.artistName = $.trim(pieces[0]).replace(/["']/g, "");
            track.trackName = $.trim(pieces[1]).replace(/["']/g, "");;
          }
          else {
            track.trackName = $.trim(text);
          }
          
          if (track.trackName == "") {
            var splitHref = a.href.split(extension)[0];
            var filename = unescape(splitHref.substr
                                             (splitHref.lastIndexOf('/')+1));
            if (filename != '') {
              track.trackName = filename;
            } else {
              if (EinInjected.TrackParser.debug) {
                console.log("No trackName found for '" + a.href + "'. Using 'Unknown Title'");
              }
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
              var entry = EinInjected.TrackParser.cleanHTML($(p).html());
              if (entry.length > longestEntry.length) {
                longestEntry = entry;
              }
            });
            
            track.description = EinInjected.TrackParser.trimString(longestEntry, 200);
          }
          if (EinInjected.TrackParser.debug) {
            console.log("new track object:", track);
          }
          
          mp3Links[track.url] = track;
        }
      }
      return mp3Links;
    },
  }, // end EinInjected.TrackParser.links
  
  tumblrDashboard : {
    /* jhawk Save for later
    loadMore : function(){
        var mp3Links = EinInjected.TrackParser.tumblrDasboard.scrape();
        if (mp3Links.length > 0){
            var o = {"msg" : "pageSongsMore", "sessionKey" : EinInjected.TrackParser.SessionKey, "data" : mp3Links};
            EinInjected.TrackParser.Comm.send(o);
        }
    },
    */
    scrape : function() {
      var mp3Links = { };
      var urls = [];
      var lis = $('li.audio');
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
            if (EinInjected.TrackParser.debug) {
              console.log("already scraped " + track.url);
            }
            continue;
          }
          
          urls.push(track.url);

          var postBody = $(li).find('.post_body').first();
          var post = EinInjected.TrackParser.cleanHTML(postBody.html());

          var albumArts = jQuery(li).find('.album_art');
          if (albumArts.length > 0) {
            var albumArt = albumArts[0];
            var titlePieces = $(albumArt).attr('title').split(' - ');
            track.artistName = $.trim(titlePieces[0]);
            track.trackName = $.trim(titlePieces[1]);
          }
          else {
            track.trackName = EinInjected.TrackParser.trimString(post, 200);
          }
          track.description = EinInjected.TrackParser.trimString(post, 200);

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
          if (EinInjected.TrackParser.debug) {
            console.log("Error in tumblrDashboard scraping");
          }
        }
      }
      return mp3Links;
    }
  }, // End EinInjected.TrackParser.tumblrDashboard
  
  tumblr: {
      /* Save for loadMore
      response : function(json){
          clearTimeout(EinInjected.TrackParser.tumblrAPI.timeout);
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
                  var o = {"msg" : "pageSongsMore", "sessionKey" : EinInjected.TrackParser.SessionKey, "data" : mp3Links};
                  EinInjected.TrackParser.Comm.send(o);
              }
          } catch(e){}
          EinInjected.TrackParser.tumblrAPI.scrape();
      },
      */
    scrape : function() {
      var mp3Links = { };
      var divs = $('div.audio_player');
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
          if (EinInjected.TrackParser.debug) {
            console.log("Error in tumblr scraping");
          }
        }
      }
      /* jhawk save for loadmore
      if (mp3Links.length > 0){
        var obj = {"msg" : "pageSongsMore", "sessionKey" : EinInjected.TrackParser.SessionKey, "data" : mp3Links};
        EinInjected.TrackParser.Comm.send(obj);
      }
      */
      return mp3Links;
    }
  }, // End EinInjected.TrackParser.tumblr
  
  audioElements : {
    scrape : function() {
      var audioElements = $('audio');
      var mp3Links = { };
      for (var i = 0; i < audioElements.length; i++) {
        var audio = audioElements[i];
        var track = { };

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
          if (EinInjected.TrackParser.debug) {
            console.log('<audio> must have src or <source>');
          }
        }
        
      }
      return mp3Links;
    }
  }, // end EinInjected.TrackParser.audioElements

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
};

if (!EinInjected.isTest()) {
  EinInjected.TrackParser.start();
}
