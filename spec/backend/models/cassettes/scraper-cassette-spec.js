describe("The Scraper Cassette", function() {

  beforeEach(function() {
    this.scraper = new this.Einplayer.Backend.Cassettes.ScraperCassette();
    
    // inject some audio files into the page
    this.testTracks = [];
  });
  
  it("should return the tracks on the page with getBrowseList", function() {
    var testComplete = false;
    var self = this;
    var context = this.Einplayer.Backend.Utils.getContext(function(context) {
      var tracks = self.scraper.getBrowseList(context);
      expect(tracks.length).toEqual(self.testTracks.length);
      testComplete = true;
    });
    
    waitsFor(function() {
      return testComplete;
    }, "Timed out waiting for context", 1000);222
  });
});
