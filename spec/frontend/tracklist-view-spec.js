describe("TrackList View", function() {

  it ("should have rows for each track when rendered", function() {
    var trackList = new this.Einplayer
                        .Backend
                        .Collections
                        .TrackList(this.testTracks);
                        
    var viewScript = this.Einplayer
                         .Backend
                         .TemplateManager
                         .getViewScript("TrackList");

    var view = new viewScript({ trackList: trackList });
    
    var listDOM = view.render();
    
    var rows  = $(listDOM).find(".row");
    
    expect(rows.length).toEqual(this.testTracks.length);
  });
  
  it ("should render properly through the TemplateManager", function() {
    var trackList = new this.Einplayer
                        .Backend
                        .Collections
                        .TrackList(this.testTracks);
    
    var listDOM = this.Einplayer.Backend.TemplateManager.renderView
                      ("TrackList", { trackList: trackList }, null);
    
    var rows  = $(listDOM).find(".row");
    
    expect(rows.length).toEqual(this.testTracks.length);
  });
});