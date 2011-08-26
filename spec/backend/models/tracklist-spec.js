describe("TrackList Model", function() {
  
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
        artistName  : "Buily By Animals",
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

  it('should create a valid TrackList from valid Track JSONs', function() {
    var trackList = new this.Einplayer
                            .Backend
                            .Collections
                            .TrackList(this.trackJSONs);
                               
    expect(trackList.length).toEqual(this.trackJSONs.length);

    trackList.add(this.trackJSONs[0]);
    expect(trackList.length).toEqual(this.trackJSONs.length + 1);

    trackList.remove(trackList.at(this.trackJSONs.length));
    expect(trackList.length).toEqual(this.trackJSONs.length);
  });


});
