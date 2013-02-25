describe("The HypeMachine Cassette", function() {

  beforeEach(function() {
    this.verifyTracks = function(actualTrackJSONs,
                                 expectedTrackJSONs,
                                 expectedAttrs,
                                 expectedTypes) {
      var self = this;

      var actualOfTypeCount = 0;
      for (var i = 0; i < actualTrackJSONs.length; i++) {
        var actualJSON = actualTrackJSONs[i];

        if (jQuery.inArray(actualJSON.type, expectedTypes) != -1) {
          var expectedJSON = expectedTrackJSONs[actualOfTypeCount];
          actualOfTypeCount++;

          for (var j = 0; j < expectedAttrs.length; j++) {
            var attr = expectedAttrs[j];
            var div = document.createElement('div');
            div.innerHTML = expectedJSON[attr];
            var decoded = div.firstChild.nodeValue;
            if (actualJSON[attr].indexOf(decoded) == -1) {
              expect(actualJSON[attr]).toMatch(decoded);
            }
          }
        }
      }

      expect(actualOfTypeCount).toEqual(expectedTrackJSONs.length);
      self.testComplete = true;
    };

    this.verifyGetBrowseList = function(expectedTrackJSONs, expectedAttrs, expectedTypes) {
      var self = this;
      self.testComplete = false;

      var testTab = self.findTestTab();
      var context = self.Tapedeck.Backend.Utils.getContext(testTab);

      self.Tapedeck.Backend.CassetteManager.currentCassette.getBrowseList(context, function(params) {

        self.verifyTracks(params.tracks,
                          expectedTrackJSONs,
                          expectedAttrs,
                          expectedTypes);
      }); // end this.verifyGetBrowseList

      // This should be instantaneous but somehow the waitsFor won't
      // let the above get scheduled.
      waitsFor(function() {
        return self.testComplete;
      }, "Timed out waiting for track parsing", 5000);
    };

    this.waitsForFrontendInit();
    this.waitsForHypeMCheck();
  }); // end beforeEach

  afterEach(function() {
    $("#testzone").remove();
  });

  it("should scrape the LastWeek page for tracks", function() {
    var self = this;
    self.testComplete = false;
    var parseHypeM = function(responseText, textStatus, jqXHR) {

      responseText = self.Tapedeck.Backend.Utils.removeTags(responseText, ["head", "script"], true);

      var html = $(responseText);
      var trackSections = $(html).find(".section-track");
      var expectedTrackJSONs = [];
      $(trackSections).each(function(index, elem) {
        var trackLink = $(elem).find("a.track")[0];
        var trackNameSpan = $(trackLink).find(".base-title")[0];
        var trackName = $(trackNameSpan).html();

        var artistLink = $(elem).find("a.artist")[0];
        var artistName = $(artistLink).html();

        expectedTrackJSONs.push({ trackName: trackName, artistName: artistName });
      });

      // switch to hypem cassette
      self.Tapedeck.Backend.CassetteManager.setCassette("HypeMachine");
      self.Tapedeck.Backend.CassetteManager.setPage(1);
      self.Tapedeck.Backend.CassetteManager.chooseFeed("Last Week");

      self.verifyGetBrowseList(expectedTrackJSONs, ["trackName", "artistName"], ["hypem"]);

    };

    $.ajax({ type: "GET",
             url: "http://hypem.com/popular/lastweek/page/1",
             dataType: "text",
             success: parseHypeM,
             error: function (response, status, xhr) {
               console.error("Ajax error retrieving http://hypem.com/popular/lastweek/page/1");
               expect("Could not request HypeM homepage").toBe(false);
               self.testComplete = true;
             }
           });
    // 1 ajax hypem pop
    // 2 extract track information
    // 3 switch to HypeM and getPage 1
    // 4 compare results

    waitsFor(function() {
      return self.testComplete;
    }, "Timed out waiting for track parsing", 5000);
    runs(function() {
      expect(self.testComplete).toBeTruthy();
    });
  });
});
