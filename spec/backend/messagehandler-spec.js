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

  it("should execute the correct script with MessageHandler.executeScript", function() {
    var spy = spyOn(EinInjected.DocumentFetcher, "start").andCallThrough();
    var testTab = this.findTestTab();

    var testComplete = false;

    var responseCallback = function(sender, response, sendResponse) {
      testComplete = true;
    };
    
    this.Einplayer.Backend.MessageHandler
                          .executeScript(testTab,
                                         {allFrames: false,
                                          file: "frontend/scripts/document-fetcher.js"},
                                         responseCallback);

    waitsFor(function() {
      return testComplete;
    }, "Waiting for script to execute", 1000);

    runs(function() {
      expect(spy).toHaveBeenCalled();
      expect(spy.callCount).toEqual(1);
    });
  });

  it("should update the correct view with MessageHandler.pushView" , function() {
    expect($("#einplayer-frame").contents()).toContain("#browse-list");
    expect($("#einplayer-frame").contents()).not.toContain("#testdiv");
    
    var testDiv = "<div id='testdiv'></div>";
    var testTab = this.findTestTab();
    this.Einplayer.Backend.MessageHandler.pushView("browse-list",
                                                   testDiv,
                                                   testTab);

   waitsFor(function() {
      return $("#einplayer-frame").contents().find("#testdiv").length > 0;
    }, "Timed out waiting for view update", 2000);

    runs(function() {
      expect($("#einplayer-frame").contents()).not.toContain("#browse-list");
      expect($("#einplayer-frame").contents()).toContain("#testdiv");
    });
  });

});
