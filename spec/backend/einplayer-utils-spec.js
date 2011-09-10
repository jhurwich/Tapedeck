describe("Utils", function() {

  beforeEach(function() {
    waitsForFrontendInit();
  });

  it("should get the current context", function() {
    var testComplete = false;
    var currentURL = window.location.href;
    
    var testTab = this.findTestTab();
    this.Einplayer.Backend.Utils.getContext(function(context) {
      expect(context.document).toBeDefined();
      expect(context.document).toMatch(/div class="jasmine_reporter"/);
      testComplete = true;
    }, testTab);

    waitsFor(function() {
      return testComplete;
    }, "Timedout waiting for context", 1000);
    
  });

});
