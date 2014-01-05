describe("Bank", function() {

  beforeEach(function() {
    this.bank = this.Tapedeck
                    .Backend
                    .Bank;
    this.testTrackListID = "testtracks123";
  });

  afterEach(function() {
    var clearFinished = false;
    this.bank.clear(function() { clearFinished = true; });
    waitsFor(function() { return clearFinished; }, "Waiting for Bank.clear to finish.", 500);
    runs(function() {
      expect(clearFinished).toBeTruthy();
    });
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
    var self = this;
    var spy = spyOn(self.bank.Memory, "rememberTrackList").andCallThrough();

    var testComplete = false;
    var trackList = new self.Tapedeck
                            .Backend
                            .Collections
                            .SavedTrackList(self.testTracks, { id: self.testTrackListID });
    trackList.trigger("add"); // we expect an add event for populated playlists or changes to the queue, force it

    waitsFor(function() { return spy.callCount > 0; }, "Waiting for trackList to be saved", 1000);
    runs(function() {
      self.bank.getSavedTrackList(self.testTrackListID, function(bankedList) {
        for (var i = 0; i < trackList.length; i++) {
          var expectedTrack = trackList.at(i);
          var bankedTrack = bankedList.at(i);
          expect(bankedTrack).toReflectJSON(expectedTrack.toJSON());
        }
        testComplete = true;
      });

      waitsFor(function() { return testComplete; }, "Waiting for tracklist from bank", 1000);
      runs(function() {
        expect(testComplete).toBeTruthy();
      });
    });
  });

  it("should save and retrieve playlists", function() {
    var self = this;
    var spy = spyOn(self.bank.Memory, "rememberTrackList").andCallThrough();

    var origPlaylistNum = self.bank.getPlaylists().length;
    var playlist = new self.Tapedeck
                           .Backend
                           .Collections
                           .Playlist(self.testTracks, { id: self.testTrackListID });

    waitsFor(function() { return spy.callCount > 0; }, "Waiting for playlist to be saved", 1000);
    runs(function() {
      var bankedPlaylists = self.bank.getPlaylists();
      expect(bankedPlaylists.length).toEqual(origPlaylistNum + 1);

      var foundPlaylist = false;
      for (var i = 0; i < bankedPlaylists.length; i++) {
        var bankedPlaylist = bankedPlaylists.at(i);
        if (bankedPlaylist.id == self.testTrackListID) {
          foundPlaylist = true;
        }
      }

      expect(foundPlaylist).toBeTruthy();
    });
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
    var self = this;

    // adjust the SYNC_WINDOW to 1sec so we don't need to wait
    self.bank.Sync.SYNC_WINDOW = 1;

    // make sure sync is not on to start
    if (self.bank.isSyncOn()) {
      self.bank.toggleSync();
    }
    expect(self.bank.isSyncOn()).not.toBeTruthy();

    // save a local playlist to see if we can find it after the switch
    var localPlaylist = new self.Tapedeck
                                .Backend
                                .Collections
                                .Playlist(self.testTracks, { id: "localTestPlaylist123" });

    var localPlaylistNum = self.bank.getPlaylists().length;

    // toggle sync, should hide the playlist we just added
    var toggleComplete = false;
    self.bank.toggleSync(function() { toggleComplete = true; });

    waitsFor(function() { return toggleComplete; }, "Waiting for sync to toggle #1.", 3000);
    runs(function() {
      expect(self.bank.isSyncOn()).toBeTruthy();

      var syncPlaylists = self.bank.getPlaylists();
      var origSyncNum = syncPlaylists.length;

      // if the playlistLists are the same size, make sure they're not the same
      if (syncPlaylists.length == localPlaylistNum) {
        for (var i = 0; i < syncPlaylists.length; i++) {
          expect(syncPlaylists.at(i).id).not.toBe(localPlaylist.id);
        }
      }


      var endSyncSpy = spyOn(self.Tapedeck.Backend.Bank.Sync, "finish").andCallThrough();

      // At this point we know the sync playlists and local playlists aren't the same.
      // Save a sync playlist to see if we can find it after the switch back.
      var syncPlaylist = new self.Tapedeck
                                 .Backend
                                 .Collections
                                 .Playlist(self.testTracks, { id: "syncTestPlaylist123" });

      waitsFor(function() { return endSyncSpy.callCount > 0; }, "Waiting for playlist to save to sync", 4000);
      runs(function() {
        syncPlaylists = self.bank.getPlaylists();
        expect(syncPlaylists.length).toEqual(origSyncNum + 1);

        // toggle sync, should hide the playlist we just added
        toggleComplete = false;
        self.bank.toggleSync(function() { toggleComplete = true; });

        waitsFor(function() { return toggleComplete; }, "Waiting for sync to toggle #2.", 1000);
        runs(function() {
          expect(self.bank.isSyncOn()).not.toBeTruthy();

          var localPlaylists = self.bank.getPlaylists();
          expect(localPlaylists.length).toEqual(localPlaylistNum);

          // Make sure we can't see the sync playlist now,
          // and that we can find the original local playlist.
          var foundLocal = false;
          for (var i = 0; i < localPlaylists.length; i++) {
            expect(localPlaylists.at(i).id).not.toBe(syncPlaylist.id);
            if (localPlaylists.at(i).id == localPlaylist.id) {
              foundLocal = true;
            }
          }
          expect(foundLocal).toBeTruthy();
        }); // ends runs after spyOn(self.Tapedeck.Backend.MessageHandler, "forceCheckSync").callCount > 0 - #2
      }); // ends runs after spyOn(self.Tapedeck.Backend.Bank.Sync, "finish").callCount > 0
    }); // ends runs after spyOn(self.Tapedeck.Backend.MessageHandler, "forceCheckSync").callCount > 0 - #1
  });

  it("should set and retrieve playlists from synced storage", function() {
    var self = this;

    // adjust the SYNC_WINDOW to 1sec so we don't need to wait
    self.bank.Sync.SYNC_WINDOW = 1;

    var runTest = function() {
      expect(self.bank.isSyncOn()).toBeTruthy();

      var origPlaylistNum = self.bank.getPlaylists().length;
      var endSyncSpy = spyOn(self.Tapedeck.Backend.Bank.Sync, "finish").andCallThrough();

      var playlist = new self.Tapedeck
                             .Backend
                             .Collections
                             .Playlist(self.testTracks, { id: self.testTrackListID });

      waitsFor(function() { return endSyncSpy.callCount > 0; }, "Waiting for playlist to save to sync", 4000);
      runs(function() {
        var bankedPlaylists = self.bank.getPlaylists();
        expect(bankedPlaylists.length).toEqual(origPlaylistNum + 1);

        var foundPlaylist = false;
        for (var i = 0; i < bankedPlaylists.length; i++) {
          var bankedPlaylist = bankedPlaylists.at(i);
          if (bankedPlaylist.id == this.testTrackListID) {
            foundPlaylist = true;
          }
        }

        expect(foundPlaylist).toBeTruthy();
      });
    };

    // we need sync to be on for self test
    if (!self.bank.isSyncOn()) {
      var toggleComplete = false;
      self.bank.toggleSync(function() { toggleComplete = true; });
      waitsFor(function() { return toggleComplete; }, "Waiting for sync to toggle.", 1000);
      runs(runTest);
    }
    else {
      runTest();
    }
  });
});