describe("Player View", function() {

  beforeEach(function() {
    // We need to wait for Einplayer.Frontend.Init to run
    waitsForFrontendInit();
  });
  
  it("should render the queue TrackList when rendered", function() {
    expect($("#einplayer-frame").contents()).toContain("#queue-list");
  });

  it("should render the browse TrackList when rendered", function() {
    expect($("#einplayer-frame").contents()).toContain("#browse-list");
  });
  
  it ("should render properly through the TemplateManager", function() {

  });
});
