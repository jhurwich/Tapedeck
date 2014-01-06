describe("PlaylistList View", function() {

  it ("should have rows for each playlist when rendered", function() {
    var testComplete = false;
    var playlist = new this.Tapedeck
                           .Backend
                           .Collections
                           .Playlist(this.testTracks);

    var viewScript = this.Tapedeck
                         .Backend
                         .TemplateManager
                         .getViewScript("PlaylistList");

    var playlistList = new this.Tapedeck
                               .Backend
                               .Collections
                               .PlaylistList([playlist]);

    var view = new viewScript({ playlistList: playlistList });
    view.render(function(listDOM) {

      // cleanup the tempalte cruft and look for the playlist rows
      listDOM = this.Tapedeck.Backend.TemplateManager.removeTemplateCruft(listDOM);
      var rows  = $(listDOM).find(".row");

      // the new-playlist-row is always present so look for 2
      expect(rows.length).toEqual(2);

      playlistList = new this.Tapedeck
                             .Backend
                             .Collections
                             .PlaylistList([playlist, playlist]);

      view = new viewScript({ playlistList: playlistList });
      view.render(function(doubleListDOM) {
        var doubleListDOM = this.Tapedeck.Backend.TemplateManager.removeTemplateCruft(doubleListDOM);
        var rows  = $(doubleListDOM).find(".row");


        // the new-playlist-row is always present so look for 3
        expect(rows.length).toEqual(3);
        testComplete = true;
      });

    });

    waitsFor(function() { return testComplete; }, "Waiting for PlaylistLists to be built", 2000);
    runs(function() {
      expect(testComplete).toBeTruthy();
    });

  });
});
