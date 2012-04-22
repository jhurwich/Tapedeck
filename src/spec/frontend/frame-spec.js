describe("Frontend Frame Logic", function() {

  beforeEach(function() {
    this.testTrackList = new this.Tapedeck.Backend
                                          .Collections
                                          .TrackList
                                          (this.testTracks);

    waitsForFrontendInit();
  });

  it("should queue a browse-track when it is double-clicked *flaky*", function() {

    this.Tapedeck.Backend.Bank.saveBrowseList(this.testTrackList);

    var testTrackView = this.Tapedeck.Backend
                                     .TemplateManager
                                     .renderView
                                     ("BrowseList",
                                      { trackList : this.testTrackList });

    $("#tapedeck-frame").contents()
                        .find("#browse-list")
                        .replaceWith(testTrackView.el);

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
    }, "Timed out waiting for tracks to be queued", 2000);

    runs(function() {
      expect(tracksQueued).toEqual(numTracks);
    });
    
  });

  it("should play a queued track when it is double-clicked *flaky*", function() {

    this.Tapedeck.Backend.Bank.saveQueue(this.testTrackList);

    var testTrackView = this.Tapedeck.Backend
                                     .TemplateManager
                                     .renderView
                                     ("Queue",
                                      { trackList   : this.testTrackList });

    $("#tapedeck-frame").contents()
                        .find("#queue-list")
                        .replaceWith(testTrackView.el);
                         
    var rows = $("#tapedeck-frame").contents()
                                   .find("#queue-list")
                                   .first()
                                   .children(".row")
                                   .not("#hidden-droprow");

    var spy = spyOn(this.Tapedeck.Backend.Sequencer, "playIndex");
    waitsFor(function() {
      return spy.callCount > 0;
    }, "Timed out waiting for tracks to be played", 2000);

    this.Tapedeck.Frontend.Frame.TrackLists.queueDblClick(rows[0]);
    
    runs(function() {
      expect(spy.callCount).toEqual(1);
    });
  });

});
