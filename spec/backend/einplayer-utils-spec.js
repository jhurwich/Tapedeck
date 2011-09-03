describe("Utils", function() {

  it("should get the current context", function() {
    var testComplete = false;
    var currentURL = window.location.href;
    var context = this.Einplayer.Backend.Utils.getContext(function(context) {
      
    
    for (var x in context) {
      console.log(x + ": " + context[x] + "\n");
    }
      expect(context.document).toBeDefined();
      expect(context.document.URL).toEqual(currentURL);
      testComplete = true;
    });

    waitsFor(function() {
      return testComplete;
    }, "Timedout waiting for context", 1000);
    
    
    
  });

});
