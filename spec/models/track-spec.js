describe("Track Model", function() {

  var Einplayer;
  beforeEach(function() {
    var Backend = chrome.extension.getBackgroundPage();
    Einplayer = Backend.Einplayer;
    
    this.trackJSON = {
      trackName   : "City of One",
      artistName  : "Pretty Lights",
      src         : "http://www.theburningear.com/media/2011/08/Ellie-Goulding-Lights-Captain-Cuts-Remix.mp3",
      
    };
  });

  

  it('should create a valid Track from valid JSON', function() {
    var track = new Einplayer.Models.Track(this.trackJSON);
    expect(track).toBeDefined();
    expect(track).toReflectJSON(this.trackJSON);

  });
  
});
