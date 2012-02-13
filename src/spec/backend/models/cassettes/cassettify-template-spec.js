describe("Cassettification", function() {

  beforeEach(function() {
    this.frame = this.Tapedeck.Frontend.Frame;
    this.cMgr = this.Tapedeck.Backend.CassetteManager;
    this.pattern = "www.theburningear.com/page/$#";

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
              .val("Test Cassette");

      var origCassetteNum = this.cMgr.cassettes.length;

      var saveSpy = spyOn(this.Tapedeck.Backend.Bank.FileSystem,
                          "saveCassette").andCallThrough();

      // Begin the Cassette save
      $(modal).find("input[type='button']").first().click();

      waitsFor(function() {
        return saveSpy.callCount > 0;
      }, "Waiting for Cassette Save", 500);

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

  /*
  it("should make a new cassette from browsing through pages", function() {

  });
*/

});
