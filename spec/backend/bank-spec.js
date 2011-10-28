describe("Bank", function() {
  
  beforeEach(function() {
    this.bank = this.Einplayer
                    .Backend
                    .Bank;
  });
  
  afterEach(function() {
    this.bank.clear();
  });

  it("should save and retrieve tracks", function() {
    var track = new this.Einplayer.Backend.Models.Track(this.testTracks[0]);
    this.bank.saveTrack(track);

    var bankedTrack = this.bank.getTrack(track.get("einID"));
    expect(bankedTrack).toReflectJSON(track.toJSON());
  });

  it("should save and retrieve tracklists", function() {
    var trackList = new this.Einplayer
                        .Backend
                        .Collections
                        .TrackList(this.testTracks);

    var listName = "testtracks123";
    this.bank.saveTrackList(listName, trackList);

    var bankedList = this.bank.getTrackList(listName);
    
    for (var i = 0; i < trackList.length; i++) {
      var expectedTrack = trackList.at(i);
      var bankedTrack = bankedList.at(i);
      expect(bankedTrack).toReflectJSON(expectedTrack.toJSON());
    };
  });
  
  it("should save and retrieve playlists", function() {
    var origPlaylistNum = this.bank.getPlaylists().length;
    var playlist = new this.Einplayer
                           .Backend
                           .Collections
                           .Playlist(this.testTracks);

    var playlistID = "testPlaylist123";
    playlist.id = playlistID;
    
    this.bank.savePlaylist(playlist);
    
    var bankedPlaylists = this.bank.getPlaylists();
    expect(bankedPlaylists.length).toEqual(origPlaylistNum + 1);
    
    var foundPlaylist = false;
    for (var i = 0; i < bankedPlaylists.length; i++) {
      var bankedPlaylist = bankedPlaylists.at(i);
      if (bankedPlaylist.id == playlistID) {
        foundPlaylist = true;
      }
    };

    expect(foundPlaylist).toBeTruthy();
  });

  it("should save and retrieve downloaded tracks", function() {
    
    // Save the tracks so the bank can find them
    var trackList = new this.Einplayer
                    .Backend
                    .Collections
                    .TrackList(this.testTracks);

    this.bank.saveTracks(trackList);

    var testComplete = false;
    var testTrack = trackList.at(0);
    var spy = spyOn(this.bank.FileSystem, "saveResponse").andCallThrough();
    
    var callback = function(url) {
      testComplete = true;
      var fileName = testTrack.get("artistName") +
                     " - " +
                     testTrack.get("trackName");

      var fileURI = new RegExp("^filesystem:chrome-extension://(.*)" +
                               fileName);
      expect(url).toMatch(fileURI);
    };
    
    this.bank.FileSystem.download(testTrack.get("einID"),
                                  callback);
    waitsFor(function() {
      return testComplete;
    }, "Timed out waiting for track download", 5000);

    runs(function() {
      expect(spy.callCount).toEqual(1);
    });
  });
  
});
