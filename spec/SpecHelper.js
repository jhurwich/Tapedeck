__Jasmine__RUN_ALL_TESTS = true;
__Jasmine__TESTS_TO_RUN = [
  "Message Handler"
];

beforeEach(function() {
  this.testTracks = [
    {
      type          : "tumblr",
      trackName     : "Ultra Thizz",
      artistName    : "Rustie",
      url           : "http://www.tumblr.com/audio_file/10011528101/tumblr_lra3d00jJO1qfvyur",
      location      : "http://postdubstep.tumblr.com/post/10011528101/rustie-ultra-thizz",
      domain        : "postdubstep.tumblr.com",
      description   : "A really cool jam.",
      albumArtSrc   : "http://29.media.tumblr.com/tumblr_lonc8qnYGB1qc4gv0o1_1311189640_cover.jpg",
    },
    {
      type          : "mp3",
      trackName     : "Rad Racer",
      artistName    : "Work Drugs",
      url           : "http://www.theburningear.com/media/2011/03/Work-Drugs-Rad-Racer-Final.mp3",
      location      : "http://www.theburningear.com/page/26/",
      domain        : "www.theburningear.com",
      description   : "Such a rad track.",
      albumArtSrc   : "http://www.theburningear.com/media/2011/03/Work-Drugs-Rad-Racer-300x300.jpg",
    },
    {
      type          : "mp3",
      trackName     : "Pretend",
      artistName    : "Ryden Ridge",
      url           : "http://www.theburningear.com/media/2011/08/Ryan-Ridge-Pretend.mp3",
      location      : "http://www.theburningear.com",
      domain        : "www.theburningear.com",
      description   : "New, and it rocks.",
      albumArtSrc   : "http://www.theburningear.com/media/2011/08/Ryan-Ridge-300x300.jpg",
    },
  ]; // End testTracks
  
  this.addMatchers({
    // A track model must reflect the JSON from which it was created in 
    // order to be considered valid.
    toReflectJSON: function(expectedJSON, exceptions) {
      if (typeof(exceptions) == "undefined") {
        exceptions = [];
      }
      for (var attrName in expectedJSON) {
        if (!($.inArray(attrName, exceptions)) && 
            expectedJSON[attrName] != this.actual.get(attrName)) {
          console.log("fail on '" + attrName + "' expected:"+ expectedJSON[attrName] + " actual:"+ this.actual.get(attrName));
          return false;
        }
      }
      return true;
    },
  });

  this.Einplayer = {};
  this.Einplayer.Backend = chrome.extension
                                 .getBackgroundPage()
                                 .Einplayer
                                 .Backend;
  var frameLoaded = false;
  var einplayerFrame = $("#einplayer-frame");

  einplayerFrame.load(function() {
    frameLoaded = true;
  });
  einplayerFrame[0].contentWindow.location.reload(true);
  
  waitsFor(function() {
    return frameLoaded;
  }, "Timedout attaching to frame", 1000);

  runs(function() {
    this.Einplayer.Frontend = einplayerFrame[0].contentWindow.Einplayer.Frontend;
  });

  this.findTestTab = function() {
    var ports = this.Einplayer.Backend.MessageHandler.ports;
    for (var id in ports) {
      var tab = ports[id].tab;
      if (tab.url.match(/chrome-extension.*SpecRunner.html$/)) {
        return tab;
      }
    }
  };
}); // end beforeEach

afterEach(function() {
  this.Einplayer.Backend.Sequencer.clear();
}); // end afterEach


waitsForFrontendInit = function() {
  // Convenience method to wait for the frontend's initialization
  waitsFor(function() {
    return ($("#einplayer-frame").contents().find("#player").length > 0);
  }, "Timedout waiting for #app to be swapped out", 1000);
}

