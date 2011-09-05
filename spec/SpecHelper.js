beforeEach(function() {
 
  this.addMatchers({
    // A track model must reflect the JSON from which it was created in 
    // order to be considered valid.
    toReflectJSON: function(expectedJSON) {
      
      for (var attrName in expectedJSON) {
        if (expectedJSON[attrName] != this.actual.get(attrName)) {
          return false;
        }
      }
      return true;
    }
  });

  this.Einplayer = {};
  this.Einplayer.Backend = chrome.extension
                                 .getBackgroundPage()
                                 .Einplayer
                                 .Backend;
  var frameLoaded = false;
  var einplayerFrame = $("#einplayer-frame");

  einplayerFrame.load(function() {
    frameLoaded = true;
  });
  einplayerFrame[0].contentWindow.location.reload(true);
  
  waitsFor(function() {
    return frameLoaded;
  }, "Timedout attaching to frame", 1000);

  runs(function() {
    this.Einplayer.Frontend = einplayerFrame[0].contentWindow.Einplayer.Frontend;
  });
});

var waitsForFrontendInit = function() {
  // Convenience method to wait for the frontend's initialization
  waitsFor(function() {
    return ($("#einplayer-frame").contents().find(".player").length > 0);
  }, "Timedout waiting for #app to be swapped out", 1000);
}
