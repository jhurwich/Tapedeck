describe("Track Model", function() {

  it('should create a valid Track from valid JSON', function() {
    var track = new this.Tapedeck.Backend.Models.Track(this.testTracks[0]);
    expect(track).toBeDefined();
    expect(track).toReflectJSON(this.trackJSON);

  });

});
