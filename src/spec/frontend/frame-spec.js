describe("Frontend Frame Logic", function() {

  beforeEach(function() {
    this.waitsForFrontendInit();

    // A fully functional frontend needs a full init, so do it if we didn't already
    if (!__Jasmine__DO_FULL_INIT) {
      this.waitsForBackendInit();
    }

  });

  it("should change feeds (needs HypeM cassette)", function() {
    var self = this;
    var cMgr = self.Tapedeck.Backend.CassetteManager;
    var tMgr = self.Tapedeck.Backend.TemplateManager;

    var cacheSpy = spyOn(self.Tapedeck.Backend.Bank, "cacheCurrentBrowseList").andCallThrough();
    var lastWeekTracks = null;
    var popularTracks = null;

    self.waitsForSwitchToBrowseList("HypeMachine");
    runs(function() {
      // get the feed for Last Week
      cMgr.chooseFeed("Last Week");
    });

    // get tracks from Last Week and save them
    waitsFor(function() { return cacheSpy.callCount > 1; }, "Waiting for Last Week BrowseList from HypeMachine.", 5000);
    runs(function() {
      tMgr.getBrowseList(true, function(lastWeekParams) {
        lastWeekTracks = lastWeekParams.browseList;
        cMgr.chooseFeed("Popular");
      }, function(error) {
        expect("There was an error getting Last Week").toEqual(false);
      }, self.findTestTab());
    });

    // get tracks from popular, check them against last week, and save them
    waitsFor(function() { return cacheSpy.callCount > 2; }, "Waiting for page1 BrowseList from HypeMachine.", 2000);
    runs(function() {
      tMgr.getBrowseList(true, function(popularParams) {

        // make sure the popular page's tracks are different from the lastweek's
        popularTracks = popularParams.browseList;
        for (var i = 0; i < popularTracks.length; i++) {
          expect(popularTracks.at(i).get("trackName")).not.toEqual(lastWeekTracks.at(i).get("trackName"));
        }

        // and go back to last week to confirm
        cMgr.chooseFeed("Last Week");
      }, function(error) {
        expect("There was an error getting popular").toEqual(false);
      }, self.findTestTab());
    });

    // get tracks from lastweek again and compare them against lastweek's first results
    waitsFor(function() { return cacheSpy.callCount > 3; }, "Waiting for page2 (again) BrowseList from HypeMachine.", 5000);
    runs(function() {

      tMgr.getBrowseList(true, function(lastWeekParamsAgain) {
        var lastWeekTracksAgain = lastWeekParamsAgain.browseList;
        for (var i = 0; i < lastWeekTracks.length; i++) {
          expect(lastWeekTracks.at(i).get("trackName")).toEqual(lastWeekTracksAgain.at(i).get("trackName"));
        }
      }, function(error) {
        expect("There was an error getting last week (again)").toEqual(false);
      }, self.findTestTab()); // end getBrowseList(... function(firstParamsAgain) {
    }); //end runs 4
  });

  it("should change to a single page (needs HypeM cassette)", function() {
    var self = this;
    var cMgr = self.Tapedeck.Backend.CassetteManager;
    var tMgr = self.Tapedeck.Backend.TemplateManager;

    var cacheSpy = spyOn(self.Tapedeck.Backend.Bank, "cacheCurrentBrowseList").andCallThrough();
    var firstPageTracks = null;
    var secondPageTracks = null;

    self.waitsForSwitchToBrowseList("HypeMachine");
    runs(function() {
      cacheSpy.reset();
      // get the second page's tracks
      cMgr.setPage(2);
    });

    // get tracks from page 2 and save them
    waitsFor(function() { return cacheSpy.callCount >= 1; }, "Waiting for page2 BrowseList from HypeMachine.", 5000);
    runs(function() {
      cacheSpy.callCount = 0;
      tMgr.getBrowseList(true, function(secondParams) {
        secondPageTracks = secondParams.browseList;
        cMgr.setPage(1);
      }, function(error) {
        expect("There was an error getting page 2").toEqual(false);
      }, self.findTestTab());
    });

    // get tracks from page 1, check them against page 2, and save them
    waitsFor(function() { return cacheSpy.callCount > 0; }, "Waiting for page1 BrowseList from HypeMachine.", 5000);
    runs(function() {
      cacheSpy.callCount = 0;

      tMgr.getBrowseList(true, function(firstParams) {
        // make sure the second page's tracks are different from the first's
        firstPageTracks = firstParams.browseList;
        for (var i = 0; i < firstPageTracks.length; i++) {
          expect(firstPageTracks.at(i).get("trackName")).not.toEqual(secondPageTracks.at(i).get("trackName"));
        }

        // and go back to the first page to confirm
        cMgr.setPage(2);
      }, function(error) {
        expect("There was an error getting page 1").toEqual(false);
      }, self.findTestTab());
    });

    // get tracks from page 2 again and compare them against page 2's first results
    waitsFor(function() { return cacheSpy.callCount > 0; }, "Waiting for page2 (again) BrowseList from HypeMachine.", 5000);
    runs(function() {

      tMgr.getBrowseList(true, function(secondParamsAgain) {
        var secondPageTracksAgain = secondParamsAgain.browseList;
        for (var i = 0; i < secondPageTracks.length; i++) {
          expect(secondPageTracks.at(i).get("trackName")).toEqual(secondPageTracksAgain.at(i).get("trackName"));
        }
      }, function(error) {
        expect("There was an error getting page 2 (again)").toEqual(false);
      }, self.findTestTab()); // end getBrowseList(... function(firstParamsAgain) {
    }); //end runs 4
  });

  it("should change to a page range (needs HypeM cassette)", function() {
    var self = this;
    var cMgr = self.Tapedeck.Backend.CassetteManager;
    var tMgr = self.Tapedeck.Backend.TemplateManager;

    var cacheSpy = spyOn(self.Tapedeck.Backend.Bank, "cacheCurrentBrowseList").andCallThrough();
    var firstPageTracks = null;
    var pageRangeTracks = null;

    self.waitsForSwitchToBrowseList("HypeMachine");
    runs(function() {
      // get the pageRange tracks
      cMgr.setPageRange(1, 3);
    });

    // get tracks from the pages and save them.  Three pages should mean three cache calls
    waitsFor(function() { return cacheSpy.callCount >= 3; }, "Waiting for pages 1-3 BrowseList from HypeMachine.", 5000);
    runs(function() {
      cacheSpy.callCount = 0;
      tMgr.getBrowseList(true, function(pageRangeParams) {
        pageRangeTracks = pageRangeParams.browseList;
        cMgr.setPage(1);
      }, function(error) {
        expect("There was an error getting page 2").toEqual(false);
      }, self.findTestTab());
    });

    // get tracks from page 1, check them against the range, and save them
    waitsFor(function() { return cacheSpy.callCount > 0; }, "Waiting for page1 BrowseList from HypeMachine.", 2000);
    runs(function() {
      cacheSpy.callCount = 0;
      tMgr.getBrowseList(true, function(firstParams) {

        // make sure the second page's tracks are different from the first's
        firstPageTracks = firstParams.browseList;
        expect(pageRangeTracks.length > firstPageTracks.length).toBeTruthy();
        for (var i = 0; i < firstPageTracks.length; i++) {
          expect(firstPageTracks.at(i).get("trackName")).toEqual(pageRangeTracks.at(i).get("trackName"));
        }

        // and go back to the first page to confirm
        cMgr.setPageRange(1, 3);
      }, function(error) {
        expect("There was an error getting page 1").toEqual(false);
      }, self.findTestTab());
    });

    // get tracks from page 2 again and compare them against page 2's first results
    waitsFor(function() { return cacheSpy.callCount >= 3; }, "Waiting for pages 1-3 (again) BrowseList from HypeMachine.", 5000);
    runs(function() {

      tMgr.getBrowseList(true, function(pageRangeParamsAgain) {
        var pageRangeTracksAgain = pageRangeParamsAgain.browseList;
        expect(pageRangeTracks.length).toEqual(pageRangeTracksAgain.length);
        for (var i = 0; i < pageRangeTracks.length; i++) {
          expect(pageRangeTracks.at(i).get("trackName")).toEqual(pageRangeTracksAgain.at(i).get("trackName"));
        }
      }, function(error) {
        expect("There was an error getting page 2 (again)").toEqual(false);
      }, self.findTestTab());
    });
  });
});
