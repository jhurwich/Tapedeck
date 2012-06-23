describe("Frontend Frame Logic", function() {

  beforeEach(function() {
    this.testTrackList = new this.Tapedeck.Backend
                                          .Collections
                                          .TrackList
                                          (this.testTracks);

    waitsForFrontendInit();
  });

  it("should queue a browse-track when it is double-clicked *flaky*", function() {

    var self = this;
    self.waitForSwitchToBrowseList();
    runs(function() {
      // Generate a new browseList for the testTracks
      var numTracks = self.testTracks.length;
      var tracksQueued = 0;

      self.Tapedeck.Backend.Bank.saveBrowseList(self.testTrackList);
      var testTrackView = self.Tapedeck.Backend.TemplateManager.renderViewWithOptions
                              ("BrowseList",
                               "default",
                               { browseList : self.testTrackList },
                               function(testTrackView) {

        // With the browseList of testTracks rendered, swap it in
        $("#tapedeck-frame").contents()
                            .find("#browse-list")
                            .replaceWith(testTrackView.el);

        var rows = $("#tapedeck-frame").contents()
                                       .find("#browse-list")
                                       .first()
                                       .find(".row")
                                       .not("#hidden-droprow");

        expect(rows.length).toEqual(numTracks);

        // Try to queue tracks from the new browseList
        self.Tapedeck.Backend.Sequencer.queue.bind("add", function() {
          tracksQueued++;
        });

        for (var i = 0; i < numTracks; i++) {
          // handle in reverse order
          var currRow = rows[numTracks - 1 - i];
          self.Tapedeck.Frontend.Frame.TrackLists.browseDblClick(currRow);
        }
      }); // end renderViewWithOptions

      waitsFor(function() {
        return tracksQueued >= numTracks;
      }, "Timed out waiting for tracks to be queued", 2000);

      runs(function() {
        expect(tracksQueued).toEqual(numTracks);
      });
    }); // end run() after switchToBrowseList
  });

  it("should play a queued track when it is double-clicked *flaky*", function() {
    var self = this;
    self.Tapedeck.Backend.Bank.saveQueue(self.testTrackList);

    var testTrackView = self.Tapedeck.Backend.TemplateManager.renderViewWithOptions
                            ("Queue",
                             "default",
                             { queue : self.testTrackList },
                             function(testTrackView) {

      $("#tapedeck-frame").contents()
                          .find("#queue")
                          .replaceWith(testTrackView.el);

      var rows = $("#tapedeck-frame").contents()
                                     .find("#queue")
                                     .first()
                                     .children(".row")
                                     .not("#hidden-droprow");
      self.Tapedeck.Frontend.Frame.TrackLists.queueDblClick(rows[0]);
    }); // end renderViewWithOptions

    var spy = spyOn(self.Tapedeck.Backend.Sequencer, "playIndex");
    waitsFor(function() {
      return spy.callCount > 0;
    }, "Timed out waiting for tracks to be played", 2000);


    runs(function() {
      expect(spy.callCount).toEqual(1);
    });
  });

});
