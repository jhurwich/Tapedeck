describe("TrackList Model", function() {

  it('should create a valid TrackList from valid Track JSONs', function() {
    var trackList = new this.Tapedeck
                            .Backend
                            .Collections
                            .TrackList(this.testTracks);

    expect(trackList.length).toEqual(this.testTracks.length);

    trackList.add(this.testTracks[0]);
    expect(trackList.length).toEqual(this.testTracks.length + 1);

    trackList.remove(trackList.at(this.testTracks.length));
    expect(trackList.length).toEqual(this.testTracks.length);
  });
});
