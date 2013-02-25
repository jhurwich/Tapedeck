describe("Message Handler", function() {

  beforeEach(function() {
    this.waitsForFrontendInit();
  });

  it("should update a view when requested", function() {
    var requestProcessed = false;

    var replaceSpy = spyOn(this.Tapedeck.Frontend.Utils, "replaceView");
    this.Tapedeck.Frontend.Messenger.requestUpdate("Frame");

    waitsFor(function() {
      return replaceSpy.callCount > 0;
    }, "Request for Frame View never completed", 2000);

    runs(function() {
      expect($(replaceSpy.mostRecentCall.args[0])).toHaveId("frame");
    })
  });

/* Flaky and won't fix, decommissioning 1-29-12
  it("should execute the correct script with MessageHandler.executeScript", function() {
    var spy = spyOn(TapedeckInjected.TrackParser, "start").andCallThrough();
    var testTab = this.findTestTab();
    expect(testTab).not.toBeNull();

    var testComplete = false;

    var responseCallback = function(sender, response, sendResponse) {
      testComplete = true;
    };

    this.Tapedeck.Backend.InjectManager
                         .executeScript(testTab,
                                        { allFrames: false,
                                          file: "frontend/scripts/track-parser.js" },
                                        responseCallback);

    waitsFor(function() {
      return testComplete;
    }, "Waiting for script to execute", 500);

    runs(function() {
      expect(spy).toHaveBeenCalled();
      expect(spy.callCount).toEqual(1);
    });
  });
*/

  it("should update the correct view with MessageHandler.pushView" , function() {

    var testDiv = '<div id="cassette-list"><div id="testdiv"></div></div>';
    var testTab = this.findTestTab();
    expect(testTab).not.toBeNull();

    this.waitsForElement("#cassette-list");
    runs(function() {
      expect($("#tapedeck-frame").contents()).toContain("#cassette-list");
      expect($("#tapedeck-frame").contents()).not.toContain("#testdiv");

      var spy = spyOn(this.Tapedeck.Frontend.Utils, "replaceView"); // NOTE: no callthrough
      this.Tapedeck.Backend.MessageHandler.pushView(testDiv, { }, { }, testTab);

      this.waits(1000);

      runs(function() {
        expect(spy).toHaveBeenCalled();
        var foundCall = false;
        for (var i = 0; i < spy.callCount; i++) {
          var args = spy.argsForCall[i];
          if (args[0] == testDiv) {
            foundCall = true;
          }
        }
        expect(foundCall).toBeTruthy();
      });
    });
  });

});
