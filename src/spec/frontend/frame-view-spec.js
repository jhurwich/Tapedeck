describe("Frame View", function() {

  beforeEach(function() {
    // We need to wait for Tapedeck.Frontend.Init to run
    this.waitsForFrontendInit();
  });

  it("should render the Player when rendered", function() {
    expect($("#tapedeck-frame").contents().find("body").first()).toContain("#player");
  });

  it("should render the queue TrackList when rendered", function() {
    expect($("#tapedeck-frame").contents().find("body").first()).toContain("#queue");
  });

});
