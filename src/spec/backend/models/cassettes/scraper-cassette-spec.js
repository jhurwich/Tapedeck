describe("The Scraper Cassette", function() {

  beforeEach(function() {
    this.scraper = new this.Tapedeck.Backend.Cassettes.ScraperCassette();

    if ($("#testzone").length > 0) {
      $("#testzone").remove();
    }
    TapedeckInjected.TrackParser.forceTumblr = false;
    TapedeckInjected.TrackParser.forceTumblrDashboard = false;

    var testzone = $("<div id='testzone'></div>");
    $("body").append(testzone);

    // inject some audio files into the page

    this.loadTracksIntoDOM = function(trackJSONs, formatFn, limitTypes) {
      for (var i = 0; i < trackJSONs.length; i++) {
        var trackJSON = trackJSONs[i];

        if (jQuery.inArray(trackJSON.type, limitTypes) != -1) {
          testzone.append(formatFn(trackJSON));
        }
      }
    };

    this.verifyTracks = function(actualTrackJSONs,
                                 expectedTrackJSONs,
                                 expectedAttrs,
                                 expectedTypes) {
      var self = this;

      var actualOfTypeCount = 0;
      for (var i = 0; i < actualTrackJSONs.length; i++) {
        var actualJSON = actualTrackJSONs[i];

        if (jQuery.inArray(actualJSON.type, expectedTypes) != -1) {
          var expectedJSON = expectedTrackJSONs[actualOfTypeCount];
          actualOfTypeCount++;

          for (var j = 0; j < expectedAttrs.length; j++) {
            var attr = expectedAttrs[j];
            expect(actualJSON[attr]).toEqual(expectedJSON[attr]);
          }
        }
      }

      expect(actualOfTypeCount).toEqual(expectedTrackJSONs.length);
      self.testComplete = true;
    };

    this.verifyGetBrowseList = function(expectedAttrs,
                                        expectedTypes,
                                        numPostLoads) {
      if (typeof(numPostLoads) == "undefined") {
        numPostLoads = 0;
      }
      var self = this;
      self.testComplete = false;

      var expectedTrackJSONs = [];
      for (var i = 0; i < self.testTracks.length; i++) {
        var testTrackJSON = self.testTracks[i];
        if (jQuery.inArray(testTrackJSON.type, expectedTypes) != -1) {
          expectedTrackJSONs.push(testTrackJSON);
        }
      }

      var testTab = self.findTestTab();
      var context = self.Tapedeck.Backend.Utils.getContext(testTab);

      var spy = null;
      if(numPostLoads != 0) {

        // We need to see that the postLoads are completed, but
        // we need to call getBrowseList to queue the postLoads.

        // NOTE: Careful here, numPostLoads != postLoadTracks.length.
        // numPostLoads refers to the number of times groups of tracks
        // will be added after the original, in the event of a
        // soundcloud playlist this can contain more than one track.
        spy = spyOn(this.Tapedeck.Backend.MessageHandler,
                    "pushBrowseTrackList");
        waitsFor(function() {
          return spy.callCount == numPostLoads;
        }, "Timed out waiting for add_tracks tracks", 2000);
      }

      var testTab = self.findTestTab();
      var context = self.Tapedeck.Backend.Utils.getContext(testTab);

      self.scraper.getBrowseList(context, function(tracks) {
        // We need to handle this a little differently if we were
        // expecting some postLoadTracks (for example from soundcloud).
        // The spy should have captured those, if it exists, so
        // pull them out and add them to the actualTracks.
        if (spy != null) {
          runs(function() {
            var postLoadTracks = spy.mostRecentCall.args[0];
            if (postLoadTracks.length > 0) {
              postLoadTracks.add(tracks);
              tracks = postLoadTracks.toJSON();
              self.verifyTracks(tracks,
                                expectedTrackJSONs,
                                expectedAttrs,
                                expectedTypes);
            }
          });
        }
        else {
          self.verifyTracks(tracks,
                            expectedTrackJSONs,
                            expectedAttrs,
                            expectedTypes);
        }
      });

      // This should be instantaneous but somehow the waitsFor won't
      // let the above get scheduled.
      waitsFor(function() {
        return self.testComplete;
      }, "Timed out waiting for track parsing", 5000);

    };

    waitsForFrontendInit();
  }); // end beforeEach

  afterEach(function() {
    $("#testzone").remove();
  });

  it("should return the *tumblr* style tracks on the page", function() {
    var asTumblr = function(trackJSON) {
      var post = $("<div class='post'> \
                      <span id='audio_player_1234567890'> \
                        <div class='audio_player'> \
                          <embed type='application/x-shockwave-flash' \
                                 quality='best' \
                          </embed> \
                        </div> \
                      </span> \
                      <p></p> \
                      <p> \
                        <a>10 September 2011</a> \
                      </p> \
                   </div>");

      var embed = post.find("embed").first();
      var srcStr = "http://assets.tumblr.com/swf/audio_player_black.swf?audio_file=" +
                   trackJSON.url +
                   "&color=FFFFFF&logo=soundcloud";
      embed.attr("src", srcStr);

      var trackInfoP = post.find("p").first();
      trackInfoP.html(trackJSON.artistName + " - " + trackJSON.trackName);

      var permaLink = post.find("a").first();
      permaLink.attr("href", trackJSON.location);
      return post;
    };

    //  tumblr is pretty freeform
    //    trackName and artistName are pretty unreliable, and
    //    domain and location, for tumblr, are based on the current
    //    page which is currently SpecRunner.html.
    var tumblrExpectedAttrs = ["url"];
    var tumblrExpectedTypes = ["mp3", "tumblr"];

    this.loadTracksIntoDOM(this.testTracks,
                           asTumblr,
                           tumblrExpectedTypes);

    // Override checking the page's url to know if on dashboard
    TapedeckInjected.TrackParser.forceTumblr = true;

    this.verifyGetBrowseList(tumblrExpectedAttrs, tumblrExpectedTypes);
  });

/****************************
*  Tumblr Dashboard 9-9-11
*
*  <li id="post_9930597361" class="post   audio  ">
*    <div class="post_content" id="post_content_9930597361">
*      <img class="album_art" style="margin-bottom:20px"></img>
*      <span id="audio_node_9930597361">
*        <div>
*          <embed type="application/x-shockwave-flash" src="http://assets.tumblr.com/swf/audio_player_black.swf?audio_file=http://www.tumblr.com/audio_file/9930597361/tumblr_lonc8qnYGB1qc4gv0&amp;color=FFFFFF" height="27" width="207" quality="best">
*        </div>
*      </span>
*      <div style="margin-top:10px;" class="post_body">
*        <blockquote>
*          <p>Portishead - Small</p>
*          <p><em>” if i remember the night that we met,</em></p>
*          <p><em>tasted a wine that i’ll never forget”</em></p>
*        </blockquote>
*      </div>
*    </div>
*    <a href="http://sir-peter.tumblr.com/post/9930597361/portishead-small-if-i-remember-the-night-that" title="View post - Wednesday, 5:29pm" class="permalink " id="permalink_9930597361"></a>
*  </li>
****************************/
  it("should return the *tumblrDashboard* style tracks on the page" , function() {
    var asTumblrDashboard = function(trackJSON) {
      var post = $("<li id='post_1234567890' class='post audio'> \
                      <img class='album_art' style='margin-bottom:20px'></img> \
                      <div class='post_content' id='post_content_1234567890'> \
                        <span id='audio_node_1234567890'> \
                          <div> \
                            <embed type='application/x-shockwave-flash' \
                                   quality='best' \
                            </embed> \
                          </div> \
                        </span> \
                        <div style='margin-top:10px;' class='post_body'> \
                          <blockquote> \
                            <p></p> \
                            <p><em></em></p> \
                          <blockquote> \
                        </div> \
                      </div> \
                      <a class='permalink' id='permalink_1234567890'></a> \
                    </li>");

      var embed = post.find("embed").first();
      var srcStr = "http://assets.tumblr.com/swf/audio_player_black.swf?audio_file=" +
                   trackJSON.url +
                   "&color=FFFFFF&logo=soundcloud";
      embed.attr("src", srcStr);

      var trackInfoP = post.find("p").first();
      trackInfoP.html(trackJSON.artistName + " - " + trackJSON.trackName);

      var albumArt = post.find(".album_art").first();
      albumArt.attr("src", trackJSON.albumArtSrc);
      albumArt.attr("title", trackJSON.artistName +
                             " - " +
                             trackJSON.trackName);

      var descriptionEm = post.find("em").first();
      descriptionEm.html(trackJSON.description);

      var permaLink = post.find(".permalink").first();
      permaLink.attr("href", trackJSON.location);
      return post;
    };

    var tumblrDashboardExpectedAttrs = ["url",
                                        "trackName",
                                        "artistName",
                                        "location"];
    var tumblrDashboardExpectedTypes = ["mp3", "tumblr"];

    this.loadTracksIntoDOM(this.testTracks,
                           asTumblrDashboard,
                           tumblrDashboardExpectedTypes);

    // Override checking the page's url to know if on dashboard
    TapedeckInjected.TrackParser.forceTumblrDashboard = true;

    this.verifyGetBrowseList(tumblrDashboardExpectedAttrs,
                             tumblrDashboardExpectedTypes);
  });

/****************************
*  The Burning Ear (http://www.theburningear.com/2011/03/mp3-dont-forget-paola-and-her-interstellar-love/)
*
*  <div class="post-10201 post type-post post_box top" id="post-10201">
*    <div class="headline_area">
*      <h2 class="entry-title">
*        <a href="http://www.theburningear.com/2011/03/mp3-dont-forget-paola-and-her-interstellar-love/" rel="bookmark" title="Permanent link to [MP3] Don’t forget PAOLA and her INTERSTELLAR LOVE">[MP3] Don’t forget PAOLA and her INTERSTELLAR LOVE</a>
*      </h2>
*    </div>
*    <div class="format_text entry-content">
*      <p>
*        <a href="http://www.theburningear.com/media/2011/03/Paola-Interstellar-Love.mp3" class="ymp-btn-page-play ymp-media-2be7821686444e32719b727919990171">Paola – Interstellar Love<em class="ymp-skin"></a>
*      </p>
*      <p style="text-align: left">Few songs have so extraordinarily withstood the test of time for us quite like this one.&nbsp; As sad as it sounds, many get lost in the clutter and are shortly forgotten.&nbsp; Paolo  graced  us with <em>Interstellar Love</em> many moons ago and provides us with a time-capsule of memories.&nbsp; This song has  weathered  numerous computer changes, mp3 players, and shitty burned  CD’s.&nbsp; Its  hard to say we’ve held on to any other single with such  persistence for  so long.&nbsp; In fact, we’re lucky we did, because this MP3 is not an easy one to find.&nbsp; Sadly, after a little bit of research there really wasn’t much information about her, so here is what <span id="apture_prvw1" class="aptureLink "><span class="aptureLinkIcon" style="background-position: 100% -1348px; ">&nbsp;</span><a href="http://en.wikipedia.org/wiki/Paola%20Bruna" class="aptureLink snap_noshots">Wikipedia</a></span> had to say.</p>
*      <p style="text-align: left">With that said, it is now time for you all to enjoy what  we’ve held so close to us, for so long.&nbsp;&nbsp; For those of you experiencing the  sheer bliss for the first  time, welcome.&nbsp; Be sure to share this with your  friends and love ones!</p>
*    </div>
*  </div>
****************************/
  it("should return the *a links* on the page as tracks", function() {
    var asLinks = function(trackJSON) {
      var post = $("<div class='post-12345 post type-post post_box top' id='post12345'> \
                      <div class='headline_area'> \
                        <h2 class='entry-title'> \
                          <a>POST TITLE HERE</a> \
                        </h2> \
                      </div> \
                      <div class='format_text entry-content'> \
                        <p> \
                          <a></a> \
                        </p> \
                        <p style='text-align: left'></p> \
                        <p style='text-align: left'></p> \
                      </div> \
                    </div>");

      var perma = post.find("h2 > a").first();
      perma.attr("href", trackJSON.location);

      var mp3Link = post.find("a").last();
      mp3Link.attr("href", trackJSON.url);
      mp3Link.html(trackJSON.artistName + " - " + trackJSON.trackName);

      // The nonlink ps are for description text
      var textPs = post.find("p").not($(mp3Link).parent());
      var currPos = 0;
      var numPs = $(textPs).size();
      var text = trackJSON.description;
      textPs.each(function(index, p) {
        if (index != numPs -1) {
          var len = Math.floor(text.length / numPs);

          // Don't break in the middle of a word
          while(text.charAt(currPos + len - 1).match(/\w/) != null) {
            len--;
          }
          $(p).html(trackJSON.description.substr(currPos, len));
          currPos += len;
        }
        else {
          $(p).html(trackJSON.description.substr(currPos));
        }
      });

      return post;
    };

    var linkExpectedAttrs = ["url", "trackName", "artistName"];
    var linkExpectedTypes = ["mp3"];

    this.loadTracksIntoDOM(this.testTracks,
                           asLinks,
                           linkExpectedTypes);


    this.verifyGetBrowseList(linkExpectedAttrs, linkExpectedTypes);
  });

  it("should return the *<audio> elements* on the page as tracks", function() {
    var asAudio = function(trackJSON) {
      var post = $("<div class='post'> \
                      <h2></h2>\
                      <audio id='trackplayer' preload controls tabindex='0'> \
                        <source> \
                        </source> \
                      </audio> \
                   </div>");

      var source = post.find("source").first();
      if (trackJSON.type == "mp3") {
        source.attr("type", "audio/mpeg");
        source.attr("src", trackJSON.url);
      }

      var header = post.find("h2").first();
      header.html(trackJSON.artistName + " - " + trackJSON.trackName);

      return post;
    };

    // Audio is going to be pretty freeform.  Only expect an url.
    var audioExpectedAttrs = ["url"];
    var audioExpectedTypes = ["mp3"];

    this.loadTracksIntoDOM(this.testTracks,
                           asAudio,
                           audioExpectedTypes);

    this.verifyGetBrowseList(audioExpectedAttrs, audioExpectedTypes);
  });

  it("should return the *Soundcloud objects* on the page as tracks", function() {
    var asSoundcloud = function(trackJSON) {
      var object = $("<object height='81' width='100%'> \
                        <param name='allowscriptaccess' value='always'> \
                        <param name='movie'> \
                        <embed allowscriptaccess='always' height='81' type='application/x-shockwave-flash' width='100%'> \
                      </object>");

      var srcParam = object.find("param[name='movie']").first();

      var src = "https://player.soundcloud.com/player.swf?url=";
      src += trackJSON.trackInfoURL;
      src += "&show_comments=true&auto_play=false&color=3299bb";

      $(srcParam).attr("value", src);

      return object;
    };

    var soundcloudExpectedAttrs = ["url",
                                   "trackName",
                                   "artistName",
                                   "description"];
    var soundcloudExpectedTypes = ["soundcloud"];

    this.loadTracksIntoDOM(this.testTracks,
                           asSoundcloud,
                           soundcloudExpectedTypes);

    this.verifyGetBrowseList(soundcloudExpectedAttrs,
                             soundcloudExpectedTypes,
                             1);


  });
});
