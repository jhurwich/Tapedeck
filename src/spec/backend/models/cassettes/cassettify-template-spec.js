describe("Cassettification", function() {

  beforeEach(function() {
    this.frame = this.Tapedeck.Frontend.Frame;
    this.cMgr = this.Tapedeck.Backend.CassetteManager;
    this.pattern = "www.theburningear.com/page/$#";
    this.cassetteName = "TestCassette";

    waitsForFrontendInit();
    runs(function() {
      var startSpy = spyOn(this.cMgr.Cassettify, "start").andCallThrough();
      waitsFor(function() {

        // make sure cassettification started and the UI is ready
        if (startSpy.callCount > 0) {
          
          var modal = $("#tapedeck-frame").contents().find("#modal");
          
          var input = $(modal).find("input[callbackparam='pattern']");
          return (input.length > 0);
        }
        return false;
      }, "Waiting for cassettification to start", 500);
      
      this.frame.CassetteList.cassettify(event);
    });
  });

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

      var readInSpy = spyOn(this.Tapedeck.Backend.CassetteManager,
                          "readInCassettes").andCallThrough();

      // Begin the Cassette save
      $(modal).find("input[type='button']").first().click();

      waitsForElement(".row[cassette-name='" + this.cassetteName + "']");
      runs(function() {
        // The Cassette was saved make sure it's in the cassettelist
        expect(this.cMgr.cassettes.length).toEqual(origCassetteNum + 1);
      });
    });
    // template should be generated and pinged

    // if successful, template will request a name
      // provide name
      // template then saved to disc and inserted to cassettelist
        // normally saved cassettes will be read in on load
      // confirm expectations for saved cassette
      // remove saved cassette

    // if not, ???

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
});
