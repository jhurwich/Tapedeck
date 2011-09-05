describe("Utils", function() {

  it("should get the current context", function() {
    var testComplete = false;
    var currentURL = window.location.href;
    var context = this.Einplayer.Backend.Utils.getContext(function(context) {
      expect(context.document).toBeDefined();
      expect(context.document).toMatch(/div class="jasmine_reporter"/);
      testComplete = true;
    });

    waitsFor(function() {
      return testComplete;
    }, "Timedout waiting for context", 1000);
    
  });

});
