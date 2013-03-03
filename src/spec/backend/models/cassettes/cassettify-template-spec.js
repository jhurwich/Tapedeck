describe("Cassettification", function() {

  beforeEach(function() {
    var self = this;
    this.frame = this.Tapedeck.Frontend.Frame;
    this.cMgr = this.Tapedeck.Backend.CassetteManager;
    this.testURL = "www.audiocred.com";
    this.pattern = this.testURL + "/page/$#";
    this.cassetteName = "TestCassette";

    this.makeTestCassette = function() {
      runs(function() {
        // start Cassettify in test mode so we can fake the currentURL (use steam.com to ensure no tracks on that site)
        var options = { isTest: true, testURL: "www.steam.com" };
        self.cMgr.Cassettify.start(options);
      });

      // wait for steam.com to fail
      waitsFor(function() {
        var modal = $("#tapedeck-frame").contents().find("#modal");
        return $(modal).find("#modal-title").html() == "Cassettify Failed";
      }, "Waiting for modal to appear", 500);

      // switch to site entry
      runs(function() {
        var modal = $("#tapedeck-frame").contents().find("#modal");
        $(modal).find("input[callbackparam='anotherSite']")[0].click();
      });

      // find the input for a url
      waitsFor(function() {
        var modal = $("#tapedeck-frame").contents().find("#modal");
        return $(modal).find("input[callbackparam='url']").length > 0;
      }, "Waiting for modal to change to pattern entry", 500);

      // input the test url
      runs(function() {
        var modal = $("#tapedeck-frame").contents().find("#modal");
        var input = $(modal).find("input[callbackparam='url']").first();

        $(input).val(self.testURL);
        $(modal).find("input[callbackparam='submit']").first().click();
      });

      // find the naming input
      waitsFor(function() {
        var modal = $("#tapedeck-frame").contents().find("#modal");
        return $(modal).find("input[callbackparam='cassetteName']").length > 0;
      }, "Waiting for modal to change to cassette naming", 2000);

      // name the cassette
      runs(function() {
        var modal = $("#tapedeck-frame").contents().find("#modal");
        // Name the Cassette when it's ready
        $(modal).find("input[callbackparam='cassetteName']")
                .first()
                .val(this.cassetteName);

        // Begin the Cassette save
        $(modal).find("input[type='button']").first().click();
      });
    };

    // Cassettification needs a full init, so do it if we didn't already
    if (!__Jasmine__DO_FULL_INIT) {
      this.waitsForBackendInit();
    }

    this.waitsForFrontendInit();
  });

  it("should make a new cassette for the current page", function() {

    var testComplete = false;

    runs(function() {
      // start Cassettify in test mode so we can fake the currentURL
      var options = { isTest: true, testURL: this.testURL };
      this.cMgr.Cassettify.start(options);

      waitsFor(function() {
        var modal = $("#tapedeck-frame").contents().find("#modal");
        return $(modal).find("input[callbackparam='cassetteName']").length > 0;
      }, "Waiting for modal to change to cassette naming", 20000);

      var origCassetteNum = this.cMgr.cassettes.length;

      runs(function() {
        // Name the Cassette when it's ready
        var modal = $("#tapedeck-frame").contents().find("#modal");
        $(modal).find("input[callbackparam='cassetteName']")
                .first()
                .val(this.cassetteName);

        // Begin the Cassette save
        $(modal).find("input[type='button']").first().click();
      });

      waitsFor(function() { return this.cMgr.cassettes.length == (origCassetteNum + 1); },
               "Waiting for cassettes to be read-in",
               2000);
      runs(function() {
        // The Cassette was saved make sure it's in the cassettelist
        expect(this.cMgr.cassettes.length).toEqual(origCassetteNum + 1);
        testComplete = true;
      });
    });

    waitsFor(function() { return testComplete; }, 20000);
    runs(function() {
      expect(testComplete).toBeTruthy();
    });

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
    var testComplete = false;

    // make the test cassette
    var origCassetteNum = this.cMgr.cassettes.length;
    this.makeTestCassette();

    waitsFor(function() { return this.cMgr.cassettes.length == (origCassetteNum + 1); },
             "Waiting for cassettes to be read-in",
             2000);

    // find the test cassette and use it
    runs(function() {
      var foundCassette = null;
      for (var i = 0; i < this.cMgr.cassettes.length; i++) {
        var cassette = this.cMgr.cassettes[i].cassette;
        if (cassette.get("name") == this.cassetteName) {
          foundCassette = cassette;
        }
      }
      expect(foundCassette).not.toBeNull();

      var testTab = this.findTestTab();
      var context = this.Tapedeck.Backend.Utils.getContext(testTab);

      foundCassette.getBrowseList(context, function(response) {
        expect(response.tracks.length).toBeGreaterThan(0);
        testComplete = true;
      });
    });

    waitsFor(function() { return testComplete; },
             "Timed out waiting for Cassettification result to getBrowseList",
             4000);
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
