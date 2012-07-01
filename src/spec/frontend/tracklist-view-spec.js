describe("TrackList View", function() {

  it ("should render propely through the TemplateManager", function() {
    var self = this;
    var tMgr = self.Tapedeck.Backend.TemplateManager;
    var trackList = new this.Tapedeck
                            .Backend
                            .Collections
                            .TrackList(this.testTracks);

    var testComplete = false;
    var options = { trackList: trackList,
                    currentCassette: null };

    tMgr.renderViewWithOptions("TrackList", "default", options, function(rendered) {
      testComplete = true;
      var rows  = $(rendered.el).find(".row").not("#hidden-droprow");
      expect(rows.length).toEqual(self.testTracks.length);
    });

    waitsFor(function() { return testComplete; }, "Waiting for rendering", 200);
    runs(function() {
      expect(testComplete).toBeTruthy();
    });
  });
});
