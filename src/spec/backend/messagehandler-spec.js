describe("Message Handler", function() {

  beforeEach(function() {
    this.waitsForFrontendInit();
  });

  it("should return a rendered view when requested", function() {
    var requestProcessed = false;
    var callback = function(response) {
      expect($(response.view)).toHaveId("frame");
      requestProcessed = true;
    };

    this.Tapedeck.Frontend.Messenger.getView
        ("Frame", { }, null, callback);

    waitsFor(function() {
      return requestProcessed;
    }, "Request for Frame View never processed", 1000);
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

  it("should update the correct view with MessageHandler.pushView *flaky*" , function() {
    expect($("#tapedeck-frame").contents()).toContain("#cassette-list");
    expect($("#tapedeck-frame").contents()).not.toContain("#testdiv");

    var testDiv = "<div id='cassette-list'><div id='testdiv'></div></div>";
    var testTab = this.findTestTab();
    expect(testTab).not.toBeNull();

    this.Tapedeck.Backend.MessageHandler.pushView(testDiv, { }, testTab);

    this.waitsForElement("#testdiv");

    runs(function() {
      expect($("#tapedeck-frame").contents()).toContain("#cassette-list");
      expect($("#tapedeck-frame").contents()).toContain("#testdiv");
    });
  });

});
