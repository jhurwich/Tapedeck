describe("Frame View", function() {

  beforeEach(function() {
    // We need to wait for Tapedeck.Frontend.Init to run
    // We need to wait for Tapedeck.Frontend.Init to run
    waitsForFrontendInit();
  });

  it("should render the Player when rendered", function() {
    expect($("#tapedeck-frame").contents()).toContain("#player");
  });

  it("should render the queue TrackList when rendered", function() {
    expect($("#tapedeck-frame").contents()).toContain("#queue");
  });

  it("should render the CassetteList when rendered", function() {
    expect($("#tapedeck-frame").contents()).toContain("#cassette-list");
  });

});
