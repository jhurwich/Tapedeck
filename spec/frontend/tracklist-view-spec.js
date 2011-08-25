describe("TrackList View", function() {

  beforeEach(function() {
    this.trackJSONs = [
      {
        trackName   : "Beards Again",
        artistName  : "MSTRKRFT",
        src         : "http://www.theburningear.com/media/2011/03/MSTRKRFT-BEARDS-AGAIN.mp3",      
      },
      {
        trackName   : "Animal Parade",
        artistName  : "Built By Animals",
        src         : "http://www.theburningear.com/media/2011/03/Built-By-Animals-Animal-Parade.mp3",
      },
      {
        trackName   : "Rad Racer",
        artistName  : "Work Drugs",
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

    console.log(viewScript);
    var view = new viewScript({ trackList: trackList });
    
    var listDOM = view.render();
    console.log(listDOM);
    var rows  = $(listDOM).find(".row");
    
    expect(rows.length).toEqual(this.trackJSONs.length);
    
  });
    
});
