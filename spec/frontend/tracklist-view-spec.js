describe("TrackList View", function() {

  beforeEach(function() {
    this.trackJSONs = [
      {
        trackName   : "Beards Again",
        artistName  : "MSTRKRFT",
        cassette    : "The Burning Ear",
        src         : "http://www.theburningear.com/media/2011/03/MSTRKRFT-BEARDS-AGAIN.mp3",      
      },
      {
        trackName   : "Animal Parade",
        artistName  : "Built By Animals",
        cassette    : "The Burning Ear",
        src         : "http://www.theburningear.com/media/2011/03/Built-By-Animals-Animal-Parade.mp3",
      },
      {
        trackName   : "Rad Racer",
        artistName  : "Work Drugs",
        cassette    : "The Burning Ear",
        src         : "http://www.theburningear.com/media/2011/03/Work-Drugs-Rad-Racer-Final.mp3",
      }
    ];
  });

  it ("should have rows for each track when rendered", function() {
    var trackList = new this.Einplayer
                        .Backend
                        .Collections
                        .TrackList(this.trackJSONs);
                        
    var viewScript = this.Einplayer
                         .Backend
                         .TemplateManager
                         .getViewScript("TrackList");

    var view = new viewScript({ trackList: trackList });
    
    var listDOM = view.render();
    
    var rows  = $(listDOM).find(".row");
    
    expect(rows.length).toEqual(this.trackJSONs.length);
  });
  
  it ("should render properly through the TemplateManager", function() {
    var trackList = new this.Einplayer
                        .Backend
                        .Collections
                        .TrackList(this.trackJSONs);
    
    var listDOM = this.Einplayer.Backend.TemplateManager.renderView
                      ("TrackList", { trackList: trackList }, null);
    
    var rows  = $(listDOM).find(".row");
    
    expect(rows.length).toEqual(this.trackJSONs.length);
  });
});
