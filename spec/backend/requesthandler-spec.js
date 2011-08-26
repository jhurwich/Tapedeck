describe("Request Handler", function() {

  beforeEach(function() {

  });
  
  it("should return a rendered view when requested", function() {
    var requestProcessed = false;
    var callback = function(response) {
      console.log("got response - " + response);
      expect($(response.view)).toHaveClass("player");
      requestProcessed = true;
    };
    
    this.Einplayer.Frontend.Requester.getView
        ("Player", { }, null, callback);
        
    waitsFor(function() {
      return requestProcessed;
    }, "Request for Player View never processed", 1000);

    runs(function() {

    });
  });

});
