__Jasmine__RUN_ALL_TESTS = true;
__Jasmine__TESTS_TO_RUN = [
  "Bank"
];

beforeEach(function() {
  this.testTracks = [
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

  this.Tapedeck = {};
  this.Tapedeck.Backend = chrome.extension
                                 .getBackgroundPage()
                                 .Tapedeck
                                 .Backend;
  var frameLoaded = false;
  var tapedeckFrame = $("#tapedeck-frame");

  tapedeckFrame.load(function() {
    frameLoaded = true;
  });
  tapedeckFrame[0].contentWindow.location.reload(true);
  
  waitsFor(function() {
    return frameLoaded;
  }, "Timedout attaching to frame", 1000);

  runs(function() {
    this.Tapedeck.Frontend = tapedeckFrame[0].contentWindow.Tapedeck.Frontend;
  });

  this.findTestTab = function() {
    var ports = this.Tapedeck.Backend.MessageHandler.ports;
    for (var id in ports) {
      var tab = ports[id].tab;
      if (tab.url.match(/chrome-extension.*SpecRunner.html$/)) {
        return tab;
      }
    }
  };
}); // end beforeEach

afterEach(function() {
  this.Tapedeck.Backend.Sequencer.clear();
}); // end afterEach


waitsForFrontendInit = function() {
  // Convenience method to wait for the frontend's initialization
  waitsFor(function() {
    return ($("#tapedeck-frame").contents().find("#player").length > 0);
  }, "Timedout waiting for #app to be swapped out", 1000);
}

