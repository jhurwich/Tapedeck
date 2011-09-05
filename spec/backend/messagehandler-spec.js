describe("Message Handler", function() {

  beforeEach(function() {
    waitsForFrontendInit();
  });
  
  it("should return a rendered view when requested", function() {
    var requestProcessed = false;
    var callback = function(response) {
      expect($(response.view)).toHaveClass("player");
      requestProcessed = true;
    };
    
    this.Einplayer.Frontend.Messenger.getView
        ("Player", { }, null, callback);
        
    waitsFor(function() {
      return requestProcessed;
    }, "Request for Player View never processed", 1000);
  });

});
