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
