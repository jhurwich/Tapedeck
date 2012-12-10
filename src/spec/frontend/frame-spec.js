describe("Frontend Frame Logic", function() {

  beforeEach(function() {
    this.waitsForFrontendInit();
  });

  it("should queue a browse-track when it is double-clicked *flaky*", function() {

    var self = this;
    var testTrackList = new this.Tapedeck.Backend.Collections.SavedTrackList(this.testTracks);
    this.waitsForSwitchToBrowseList();
    runs(function() {
      // Generate a new browseList for the testTracks
      var numTracks = self.testTracks.length;
      var tracksQueued = 0;

      self.Tapedeck.Backend.Bank.saveCurrentBrowseList(testTrackList);
      var testTrackView = self.Tapedeck.Backend.TemplateManager.renderViewWithOptions
                              ("BrowseList",
                               "default",
                               { browseList : testTrackList },
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
    var queuePrepared = false;

    var queueID = self.Tapedeck.Backend.Bank.savedQueueName;
    var queueReplacement = new this.Tapedeck.Backend.Collections.SavedTrackList(this.testTracks,
                                                                                { id: queueID });

    self.Tapedeck.Backend.Sequencer.prepareQueue(self.testTrackList, function() { queuePrepared = true; });

    // wait for the new queue to be prepared
    waitsFor(function() { return queuePrepared; }, "Waiting for new queue to be ready", 500);
    runs(function() {

      var queueReadySpy = spyOn(self.Tapedeck.Backend.MessageHandler, "updateView").andCallThrough();
      self.Tapedeck.Backend.Sequencer.queue.trigger("change"); // force frontend to update

      waitsFor(function() { return queueReadySpy.callCount > 0; }, "Waiting for Queue to populate", 1000);
      runs(function() {
        var rows = $("#tapedeck-frame").contents()
                                       .find("#queue")
                                       .first()
                                       .children(".row")
                                       .not("#hidden-droprow");
        self.Tapedeck.Frontend.Frame.TrackLists.queueDblClick(rows[0]);

        var sqcrSpy = spyOn(self.Tapedeck.Backend.Sequencer, "playIndex");
        waitsFor(function() {
          return sqcrSpy.callCount > 0;
        }, "Timed out waiting for tracks to be played", 2000);


        runs(function() {
          expect(sqcrSpy.callCount).toEqual(1);
        });
      });
    });
  });

});
