describe("Track Model", function() {

  beforeEach(function() {
    
    this.trackJSON = {
      trackName   : "Beards Again",
      artistName  : "MSTRKRFT",
      src         : "http://www.theburningear.com/media/2011/03/MSTRKRFT-BEARDS-AGAIN.mp3",      
    };
  });

  

  it('should create a valid Track from valid JSON', function() {
    var track = new this.Einplayer.Backend.Models.Track(this.trackJSON);
    expect(track).toBeDefined();
    expect(track).toReflectJSON(this.trackJSON);

  });
  
});
