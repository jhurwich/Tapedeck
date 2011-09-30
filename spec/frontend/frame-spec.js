describe("Frontend Frame Logic", function() {

  beforeEach(function() {
    this.testTrackList = new this.Einplayer.Backend
                                           .Collections
                                           .TrackList
                                           (this.testTracks);

    this.testTrackView = this.Einplayer.Backend
                                       .TemplateManager
                                       .renderView
                                       ("TrackList",
                                        { trackList   : this.testTrackList,
                                          rowDblClick : "test123" });
    waitsForFrontendInit();
  });

  it("should queue a browse-track when it is double-clicked", function() {

    this.testTrackView.id = "browse-list";

    $("#einplayer-frame").contents()
                         .find("#browse-list")
                         .replaceWith(this.testTrackView);
                         
    var rows = $("#einplayer-frame").contents()
                                    .find("#browse-list")
                                    .first()
                                    .children(".row");

    // sanity check
    var numTracks = this.testTracks.length;
    expect(rows.length).toEqual(numTracks);

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

    this.testTrackView.id = "queue-list";

    $("#einplayer-frame").contents()
                         .find("#queue-list")
                         .replaceWith(this.testTrackView);
                         
    var rows = $("#einplayer-frame").contents()
                                    .find("#queue-list")
                                    .first()
                                    .children(".row");

    var spy = spyOn(this.Einplayer.Backend.Sequencer, "playTrack");
  });

});
