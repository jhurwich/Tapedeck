describe("Cassettification", function() {

  beforeEach(function() {
    var self = this;
    this.frame = this.Tapedeck.Frontend.Frame;
    this.cMgr = this.Tapedeck.Backend.CassetteManager;
    this.testURL = "www.theburningear.com";
    this.pattern = this.testURL + "/page/$#";
    this.cassetteName = "TestCassette";

    this.makeTestCassette = function() {
      var request = null;

      // trigger cassettification with the known-bad "steam.com", waiting for failure
      this.waitsForPostMessage({ action: "showModal", checkUntilTrue: true, timeoutStr: "steam.com" }, function() {
        // start Cassettify in test mode so we can fake the currentURL (use steam.com to ensure no tracks on that site)
        var options = { isTest: true, testURL: "www.steam.com" };
        self.cMgr.Cassettify.start(options);
      }, function(aRequest) {
        request = aRequest;
        return $(request.view).find("#modal-title").html() == "Cassettify Failed";
      });

      // trigger "anotherSite" Cassettification and wait for url input
      runs(function() {
        this.waitsForPostMessage({ action: "showModal", checkUntilTrue: true, timeoutStr: "anotherSite" }, function() {
          var response = this.Tapedeck.Frontend.Utils.newResponse(request);
          response.params = { submitButton: "anotherSite" };
          this.Tapedeck.Frontend.Messenger.sendMessage(response);
        }, function(aRequest) {
          request = aRequest;
          return $(request.view).find("input[callbackparam='url']").length > 0;
        });
      });

      // specify the desired url and wait for the naming request
      runs(function() {
        this.waitsForPostMessage({ action: "showModal", checkUntilTrue: true, delay: 60000, timeoutStr: "name cassette"  }, function() {
          var response = this.Tapedeck.Frontend.Utils.newResponse(request);
          response.params = { "url" : self.testURL };
          this.Tapedeck.Frontend.Messenger.sendMessage(response);
        }, function(aRequest) {
          request = aRequest;
          return $(request.view).find("input[callbackparam='cassetteName']").length > 0;
        });
      });

      // name the cassette
      runs(function() {
        var response = this.Tapedeck.Frontend.Utils.newResponse(request);
        response.params = { "cassetteName" : this.cassetteName };
        this.Tapedeck.Frontend.Messenger.sendMessage(response);
      });
    };

    // Cassettification needs a full init, so do it if we didn't already
    if (!__Jasmine__DO_FULL_INIT) {
      this.waitsForBackendInit();
    }

    this.waitsForFrontendInit();
  });

  it("should make a new cassette from a pattern input", function() {

    var origCassetteNum = this.cMgr.cassettes.length;
    this.makeTestCassette();

    waitsFor(function() { return this.cMgr.cassettes.length == (origCassetteNum + 1); },
             "Waiting for cassettes to be read-in",
             2000);
    runs(function() {
      // The Cassette was saved make sure it's in the cassettelist
      expect(this.cMgr.cassettes.length).toEqual(origCassetteNum + 1);
    });
  });

  it("should make cassettes that work (depends on testURL having tracks!)", function() {
    var self = this;
    var testComplete = false;

    // make the test cassette
    var origCassetteNum = this.cMgr.cassettes.length;
    this.makeTestCassette();

    waitsFor(function() { return this.cMgr.cassettes.length == (origCassetteNum + 1); },
             "Waiting for cassettes to be read-in",
             2000);

    var getBrowseListSpy = spyOn(this.Tapedeck.Backend.TemplateManager, "getBrowseList").andCallThrough();
    var addSpy = spyOn(this.Tapedeck.Backend.MessageHandler, "addTracks").andCallThrough();

    // use the test cassette
    runs(function() {
      self.cMgr.setCassette(self.cassetteName);
    });

    waitsFor(function() {
      return getBrowseListSpy.callCount > 0;
    }, "Timed out waiting for browselist for new cassette", 2000);

    // if we got tracks from the browselist we're done, otherwise wait for an addTracks call with some
    waitsFor(function() {
      if (testComplete) {
        return testComplete;
      }
      else if (addSpy.callCount > 0) {
        var tracks = addSpy.mostRecentCall.args[1];
        testComplete = (tracks.length > 0);
        return testComplete;
      }
    }, "Timed out waiting for Cassettification result to getBrowseList", 10000);
    runs(function() {
      expect(testComplete).toBeTruthy();
    });
  });

  it("should make cassettes that are removeable", function() {

    var origCassetteNum = this.cMgr.cassettes.length;
    this.makeTestCassette();

    waitsFor(function() { return this.cMgr.cassettes.length == (origCassetteNum + 1); },
             "Waiting for cassettes to be read-in",
             2000);

    // find the test cassette and use it
    runs(function() {
      expect(this.cMgr.cassettes.length).toEqual(origCassetteNum + 1);
      this.cMgr.removeCassette(this.cassetteName);
    });

    waitsFor(function() {
      return (this.cMgr.cassettes.length <= origCassetteNum);
    }, "Timed out waiting for a cassette to be remove", 1000);

    runs(function() {
      expect(this.cMgr.cassettes.length).toEqual(origCassetteNum);
    });
  });

});
