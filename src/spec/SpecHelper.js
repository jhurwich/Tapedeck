__Jasmine__RUN_ALL_TESTS = true;
__Jasmine__TESTS_TO_RUN = [
  "The HypeMachine Cassette",
  "Frontend Frame Logic"
];

__Jasmine__TESTS_TO_SKIP = [
  "Bank",
  "Options Manager"
];

/* Runs initialization before each test.
 * Dramatically slows down test suite and can get crashy.  */
__Jasmine__DO_FULL_INIT = false;

beforeEach(function() {
  this.Tapedeck = {};
  this.Tapedeck.Backend = chrome.extension
                                 .getBackgroundPage()
                                 .Tapedeck
                                 .Backend;


  /********* addMatchers *************/
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
          console.log("Fail on '" + attrName + "' expected:"+ expectedJSON[attrName] + " actual:"+ this.actual.get(attrName)); /* ALLOWED */
          return false;
        }
      }
      return true;
    },
  });


  /********* Added waitsFor *************/
  this.waitsForSwitchToBrowseList = function(cassetteName) {
    if (typeof(cassetteName) == "undefined") {
      cassetteName = "Scraper";
    }

    // only wait if we are actually changing
    if (this.Tapedeck.Backend.CassetteManager.currentCassette == null ||
        this.Tapedeck.Backend.CassetteManager.currentCassette.name != cassetteName) {
      var spy = spyOn(this.Tapedeck.Backend.TemplateManager, "renderViewAndPush").andCallThrough();

      // change the cassette and wait
      this.Tapedeck.Frontend.Messenger.setCassette(cassetteName);
      waitsFor(function() {
        return (spy.callCount > 0);
      }, "Waiting for switch to setCassette", 600);
      runs(function() {

        // make sure the browselist got updated in the view
        waitsFor(function() {
          return ($("#tapedeck-frame").contents().find("#browse-list").length > 0);
        }, "Waiting for switch to BrowseList mode", 2000);
      });
    }
  };

  this.waitsForBackendInit = function() {
    var initComplete = false;
    waitsFor(function() { return initComplete; },
             "Waiting for Backend.init()",
             1000);
    this.Tapedeck.Backend.init(function() {
      initComplete = true;
    });
  };

  // Convenience method to wait for the frontend's initialization
  this.waitsForFrontendInit = function() {
    this.waitsForElement("#player");
  };

  this.waitsForElement = function(selector) {
    waitsFor(function() {
      return ($("#tapedeck-frame").contents().find(selector).length > 0);
    }, "Timedout waiting for '" + selector + "' to populate", 2000);
  };


  /********* Utility *************/
  this.findTestTab = function() {
    var ports = this.Tapedeck.Backend.MessageHandler.ports;
    for (var id in ports) {
      var tab = ports[id].sender.tab;
      if (tab.url.match(/chrome-extension.*SpecRunner.html$/)) {
        return tab;
      }
    }
  };

   // recreate the options object returned by the conf with the actual settings
  this.recoverOptions = function() {
    var bank = this.Tapedeck.Backend.Bank;
    // dev local overrides
    var devTemplates = ((bank.devTemplates) ? bank.devTemplates : "");
    if (devTemplates.length > 0) {
      devTemplates = devTemplates.url.substring(devTemplates.url.lastIndexOf("/") + 1);
    }

    var devCSS = ((bank.devCSS) ? bank.devCSS : "");
    if (devCSS.length > 0) {
      devCSS = devCSS.url.substring(devCSS.url.lastIndexOf("/") + 1);
    }

    var devCassettes = ((bank.devCassettes) ? bank.devCassettes : []);
    devCassettes = _.map(devCassettes, function(cassetteData) {
      var lastSlash = cassetteData.url.lastIndexOf("/");
      return cassetteData.url.substring(lastSlash + 1);
    });

    /* Expected to match { pattern: <string_pattern>, cassetteName: <string_name>},
     * as the params to createByPattern */
    var premadeCassettes = bank.premadeCassettes;
    premadeCassettes = _.map(premadeCassettes, function(cassetteData) {
      return cassetteData.pattern;
    });
    // logs
    var logs = this.Tapedeck.Backend.Utils.logLevels;

    var options = { devTemplates: devTemplates,
                    devCSS: devCSS,
                    devCassettes: devCassettes,
                    premadeCassettes: premadeCassettes,
                    logs: logs };
    return options;
  };

  this.ensureHypeMCassetteIsLoaded = function(callback) {
    var cassettes = this.Tapedeck.Backend.CassetteManager.cassettes;
    var found = false;
    for (var i = 0; i < cassettes.length; i++) {
      if (cassettes[i].cassette.get("name") == "HypeMachine") {
        found = true;
        break;
      }
    }

    if (!found) {
      this.Tapedeck.Backend.Bank.setDevCassettes(["hypemcassette.js"], true, callback);
    } else{
      callback();
    }
  };

  this.waitsForHypeMCheck = function() {
    var checkComplete = false;
    waitsFor(function() { return checkComplete; },
             "Waiting for the HypeM Cassette",
             1000);
    this.ensureHypeMCassetteIsLoaded(function() {
      checkComplete = true;
    });
  };

  this.testTracks = [
    {
      type          : "mp3",
      trackName     : "Rad Racer",
      cassette      : "TestCassette",
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
      cassette      : "TestCassette",
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
      cassette      : "TestCassette",
      url           : "http://www.tumblr.com/audio_file/10011528101/tumblr_lra3d00jJO1qfvyur",
      location      : "http://postdubstep.tumblr.com/post/10011528101/rustie-ultra-thizz",
      domain        : "postdubstep.tumblr.com",
      description   : "A really cool jam.",
      albumArtSrc   : "http://29.media.tumblr.com/tumblr_lonc8qnYGB1qc4gv0o1_1311189640_cover.jpg",
    },
    {
      type          : "soundcloud",
      trackName     : "Bernal Heights",
      artistName    : "jhameel",
      cassette      : "TestCassette",
      url           : "http://api.soundcloud.com/tracks/10558879/stream?consumer_key=46785bdeaee8ea7f992b1bd8333c4445",
      trackInfoURL  : "http://api.soundcloud.com/tracks/10558879",
      location      : "http://www.audiocred.com/2011/11/jhameel-wicked/",
      domain        : "www.audiocred.com",
      description   : "free album download at http://www.jhameel.com",
      albumArtSrc   : "",
    },
  ]; // End testTracks


  /********* Bootstrapping *************/
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
    this.Tapedeck.Backend.Bank.clear();
  });

  if (__Jasmine__DO_FULL_INIT) {
    this.waitsForBackendInit();
  }
}); // end beforeEach

afterEach(function() {
  var cleanComplete = false;
  this.Tapedeck.Backend.Sequencer.clear(function() {
    this.Tapedeck.Backend.Bank.clear(function() { cleanComplete = true; });
  });
  waitsFor(function() { return cleanComplete; }, "Waiting for cleanup", 500);
  runs(function() { expect(cleanComplete).toBeTruthy(); });
}); // end afterEach



