describe("TrackList View", function() {

  it ("should have rows for each track when rendered", function() {
    var trackList = new this.Tapedeck
                            .Backend
                            .Collections
                            .TrackList(this.testTracks);
                        
    var viewScript = this.Tapedeck
                         .Backend
                         .TemplateManager
                         .getViewScript("TrackList");

    var view = new viewScript({ trackList: trackList });
    
    var listDOM = view.render();
    
    var rows  = $(listDOM).find(".row").not("#hidden-droprow");

    expect(rows.length).toEqual(this.testTracks.length);
  });
  
  it ("should render properly through the TemplateManager", function() {
    var trackList = new this.Tapedeck
                            .Backend
                            .Collections
                            .TrackList(this.testTracks);
    
    var listDOM = this.Tapedeck.Backend.TemplateManager.renderView
                      ("TrackList", { trackList: trackList }, null);
    
    var rows  = $(listDOM).find(".row").not("#hidden-droprow");

    expect(rows.length).toEqual(this.testTracks.length);
  });
});
