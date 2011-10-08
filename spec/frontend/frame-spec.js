describe("Frontend Frame Logic", function() {

  beforeEach(function() {
    this.testTrackList = new this.Einplayer.Backend
                                           .Collections
                                           .TrackList
                                           (this.testTracks);
    waitsForFrontendInit();
  });

  it("should queue a browse-track when it is double-clicked", function() {

    var testTrackView = this.Einplayer.Backend
                                      .TemplateManager
                                      .renderView
                                      ("BrowseList",
                                       { trackList   : this.testTrackList });

    $("#einplayer-frame").contents()
                         .find("#browse-list")
                         .replaceWith(testTrackView);
                         
    var rows = $("#einplayer-frame").contents()
                                    .find("#browse-list")
                                    .first()
                                    .children(".row");

    // Sanity check. We expect one more because of the hidden dropzone 'row'
    var numTracks = this.testTracks.length;
    expect(rows.length).toEqual(numTracks + 1);

    var tracksQueued = 0;
    this.Einplayer.Backend.Sequencer.queue.bind("add", function() {
      tracksQueued++;
    });

    for (var i = 0; i < numTracks; i++) {
      // handle in reverse order
      var currRow = rows[numTracks - 1 - i];
      this.Einplayer.Frontend.Frame.browseDblClick(currRow);
    }

    waitsFor(function() {
      return tracksQueued >= numTracks;
    }, "Timed out waiting for tracks to be queued", 1000);

    runs(function() {
      expect(tracksQueued).toEqual(numTracks);
    });
    
  });

  it("should play a queued track when it is double-clicked", function() {

    var testTrackView = this.Einplayer.Backend
                                      .TemplateManager
                                      .renderView
                                      ("Queue",
                                       { trackList   : this.testTrackList });

    $("#einplayer-frame").contents()
                         .find("#queue-list")
                         .replaceWith(testTrackView);
                         
    var rows = $("#einplayer-frame").contents()
                                    .find("#queue-list")
                                    .first()
                                    .children(".row");

    var spy = spyOn(this.Einplayer.Backend.Sequencer, "playIndex");
    waitsFor(function() {
      return spy.callCount > 0;
    }, "Timed out waiting for tracks to be queued", 1000);

    this.Einplayer.Frontend.Frame.queueDblClick(rows[0]);
    
    runs(function() {
      expect(spy.callCount).toEqual(1);
    });
  });

});
