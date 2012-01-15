describe("Frontend Frame Logic", function() {

  beforeEach(function() {
    this.testTrackList = new this.Tapedeck.Backend
                                          .Collections
                                          .TrackList
                                          (this.testTracks);

    this.Tapedeck.Backend.Bank.saveTracks(this.testTrackList);
    waitsForFrontendInit();
  });

  it("should queue a browse-track when it is double-clicked", function() {

    var testTrackView = this.Tapedeck.Backend
                                     .TemplateManager
                                     .renderView
                                     ("BrowseList",
                                      { trackList : this.testTrackList });

    $("#tapedeck-frame").contents()
                        .find("#browse-list")
                        .replaceWith(testTrackView);
                         
    var rows = $("#tapedeck-frame").contents()
                                   .find("#browse-list")
                                   .first()
                                   .find(".row")
                                   .not("#hidden-droprow");

    var numTracks = this.testTracks.length;
    expect(rows.length).toEqual(numTracks);

    var tracksQueued = 0;
    this.Tapedeck.Backend.Sequencer.queue.bind("add", function() {
      tracksQueued++;
    });

    for (var i = 0; i < numTracks; i++) {
      // handle in reverse order
      var currRow = rows[numTracks - 1 - i];
      this.Tapedeck.Frontend.Frame.TrackLists.browseDblClick(currRow);
    }

    waitsFor(function() {
      return tracksQueued >= numTracks;
    }, "Timed out waiting for tracks to be queued", 1000);

    runs(function() {
      expect(tracksQueued).toEqual(numTracks);
    });
    
  });

  it("should play a queued track when it is double-clicked", function() {
    return;
    var testTrackView = this.Tapedeck.Backend
                                     .TemplateManager
                                     .renderView
                                     ("Queue",
                                      { trackList   : this.testTrackList });

    $("#tapedeck-frame").contents()
                        .find("#queue-list")
                        .replaceWith(testTrackView);
                         
    var rows = $("#tapedeck-frame").contents()
                                   .find("#queue-list")
                                   .first()
                                   .children(".row")
                                   .not("#hidden-droprow");

    var spy = spyOn(this.Tapedeck.Backend.Sequencer, "playIndex");
    waitsFor(function() {
      return spy.callCount > 0;
    }, "Timed out waiting for tracks to be played", 1000);

    this.Tapedeck.Frontend.Frame.TrackLists.queueDblClick(rows[0]);
    
    runs(function() {
      expect(spy.callCount).toEqual(1);
    });
  });

});
