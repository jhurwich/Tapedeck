describe("Bank", function() {

  beforeEach(function() {
    this.bank = this.Tapedeck
                    .Backend
                    .Bank;
  });

  afterEach(function() {
    this.bank.clear();
  });

  it("should save and retrieve tracks", function() {
    var track = new this.Tapedeck.Backend.Models.Track(this.testTracks[0]);
    var trackList = new this.Tapedeck
                            .Backend
                            .Collections
                            .TrackList();
    trackList.add(track);
    this.bank.Memory.rememberTrackList("__testTracks", trackList);

    var bankedTrack = this.bank.getTrack(track.get("tdID"));
    expect(bankedTrack).toReflectJSON(track.toJSON());
  });

  it("should save and retrieve tracklists", function() {
    var testComplete = false;
    var trackList = new this.Tapedeck
                            .Backend
                            .Collections
                            .TrackList(this.testTracks);

    var listName = "testtracks123";
    this.bank.saveTrackList(listName, trackList);

    this.bank.getTrackList(listName, function(bankedList) {
      for (var i = 0; i < trackList.length; i++) {
        var expectedTrack = trackList.at(i);
        var bankedTrack = bankedList.at(i);
        expect(bankedTrack).toReflectJSON(expectedTrack.toJSON());
      };
      testComplete = true;
    });

    waitsFor(function() { return testComplete }, "Waiting for tracklist from bank", 1000);
    runs(function() {
      expect(testComplete).toBeTruthy();
    })
  });

  it("should save and retrieve playlists", function() {
    var origPlaylistNum = this.bank.getPlaylists().length;
    var playlist = new this.Tapedeck
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
    var trackList = new this.Tapedeck
                            .Backend
                            .Collections
                            .TrackList(this.testTracks);

    this.bank.Memory.rememberTrackList("__testTracklist", trackList);

    var testComplete = false;
    var testTrack = trackList.at(0);
    var spy = spyOn(this.bank.FileSystem, "saveResponse").andCallThrough();

    var callback = function(fileData) {
      testComplete = true;
      var fileName = testTrack.get("artistName") +
                     " - " +
                     testTrack.get("trackName");

      var fileURI = new RegExp("^filesystem:chrome-extension://(.*)" +
                               fileName);
      var url = decodeURIComponent(fileData.url);
      expect(url).toMatch(fileURI);
    };

    this.bank.FileSystem.download(testTrack.get("tdID"),
                                  callback);
    waitsFor(function() {
      return testComplete;
    }, "Timed out waiting for track download", 5000);

    runs(function() {
      expect(spy.callCount).toEqual(1);
    });
  });

  it("should get rid of local playlists when switching to sync", function() {
    // make sure sync is not on to start
    if (this.bank.isSyncOn()) {
      this.bank.toggleSync();
    }
    expect(this.bank.isSyncOn()).not.toBeTruthy();

    // save a local playlist to see if we can find it after the switch
    var localPlaylist = new this.Tapedeck
                                .Backend
                                .Collections
                                .Playlist(this.testTracks);
    localPlaylist.id = "localTestPlaylist123";
    this.bank.savePlaylist(localPlaylist);

    var localPlaylistNum = this.bank.getPlaylists().length;

    // toggle sync, should hide the playlist we just added
    this.bank.toggleSync();
    expect(this.bank.isSyncOn()).toBeTruthy();

    var syncPlaylists = this.bank.getPlaylists();

    // if the playlistLists are the same size, make sure they're not the same
    if (syncPlaylists.length == localPlaylistNum) {
      for (var i = 0; i < syncPlaylists.length; i++) {
        expect(syncPlaylists.at(i).id).not.toBe(localPlaylist.id);
      };
    }

    // At this point we know the sync playlists and local playlists aren't the same.
    // Save a sync playlist to see if we can find it after the switch back.
    var syncPlaylist = new this.Tapedeck
                               .Backend
                               .Collections
                               .Playlist(this.testTracks);
    syncPlaylist.id = "syncTestPlaylist123";
    this.bank.savePlaylist(syncPlaylist);

    var syncPlaylistNum = this.bank.getPlaylists().length;

    // toggle sync, should hide the playlist we just added
    this.bank.toggleSync();
    expect(this.bank.isSyncOn()).not.toBeTruthy();

    var localPlaylists = this.bank.getPlaylists();

    // Make sure we can't see the sync playlist now,
    // and that we can find the original local playlist.
    var foundLocal = false;
    for (var i = 0; i < localPlaylists.length; i++) {
      expect(localPlaylists.at(i).id).not.toBe(syncPlaylist.id);
      if (localPlaylists.at(i).id == localPlaylist.id) {
        foundLocal = true;
      }
    };
    expect(foundLocal).toBeTruthy();
  });

  it("should set and retrieve playlists from synced storage", function() {
    var playlist = new this.Tapedeck
                           .Backend
                           .Collections
                           .Playlist(this.testTracks);

    var playlistID = "testPlaylist123";
    playlist.id = playlistID;

    if (!this.bank.isSyncOn()) {
      this.bank.toggleSync();
    }
    expect(this.bank.isSyncOn()).toBeTruthy();

    var origPlaylistNum = this.bank.getPlaylists().length;
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
