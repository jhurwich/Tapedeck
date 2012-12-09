describe("Cassettification", function() {

  beforeEach(function() {
    this.frame = this.Tapedeck.Frontend.Frame;
    this.cMgr = this.Tapedeck.Backend.CassetteManager;
    this.testURL = "www.theburningear.com";
    this.pattern = "www.theburningear.com/page/$#";
    this.cassetteName = "TestCassette";


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

/*
  it("should make a new cassette from a pattern input", function() {
    var modal = $("#tapedeck-frame").contents().find("#modal");
    var input = $(modal).find("input[callbackparam='pattern']").first();

    $(input).val(this.pattern);

    $(modal).find("input[type='button']").first().click();

    waitsFor(function() {
      modal = $("#tapedeck-frame").contents().find("#modal");
      return $(modal).find("input[callbackparam='cassetteName']").length > 0;
    }, "Waiting for modal to change", 500);

    runs(function() {
      // Name the Cassette when it's ready
      $(modal).find("input[callbackparam='cassetteName']")
              .first()
              .val(this.cassetteName);

      var origCassetteNum = this.cMgr.cassettes.length;

      // Begin the Cassette save
      $(modal).find("input[type='button']").first().click();

      waitsFor(function() { return this.cMgr.cassettes.length == (origCassetteNum + 1); },
               "Waiting for cassettes to be read-in",
               2000);
      runs(function() {
        // The Cassette was saved make sure it's in the cassettelist
        expect(this.cMgr.cassettes.length).toEqual(origCassetteNum + 1);
      });
    });
  });

  it("should make cassettes that work (depends on TBE having tracks!)", function() {
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

    var testComplete = false;
    foundCassette.getBrowseList(context, function(tracks) {
      expect(tracks.length).toBeGreaterThan(0);
      testComplete = true;
    });

    waitsFor(function() { return testComplete },
             "Timed out waiting for Cassettification result to getBrowseList",
             4000);
  });

  it("should make cassettes that are removeable", function() {

    var origCassetteNum = this.cMgr.cassettes.length;
    this.cMgr.removeCassette(this.cassetteName);

    waitsFor(function() {
      return (this.cMgr.cassettes.length < origCassetteNum);
    }, "Timed out waiting for a cassette to be remove", 1000);

    runs(function() {
      expect(this.cMgr.cassettes.length).toEqual(origCassetteNum - 1);
    });
  });
*/
});
