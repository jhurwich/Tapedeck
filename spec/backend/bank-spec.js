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
  
});
