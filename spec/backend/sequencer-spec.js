describe("Sequencer", function() {

  beforeEach(function() {
    this.sqcr = this.Einplayer.Backend.Sequencer;
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
    
    waitsFor(function() {
      return this.sqcr.currentState != null;
    }, "Timed out waiting for Sequencer init", 1000);
  });

  it("should be instantialized and initialized", function() {
    expect(this.sqcr).toBeDefined();
    expect(this.sqcr.currentState).toBeDefined();
    expect(this.sqcr.queue).toBeDefined();
  });

  it("should add tracks with push", function() {
    var origLen = this.sqcr.queue.length;

    this.sqcr.push(this.trackJSONs[0]);

    expect(this.sqcr.queue.length).toEqual(origLen + 1);
  });

  it("should call pushView when a track is added", function() {
    var spy = spyOn(this.Einplayer.Backend.MessageHandler, "pushView")
                   .andCallThrough();

    this.sqcr.push(this.trackJSONs[0]);
    expect(spy).toHaveBeenCalled();
    expect(spy.callCount).toEqual(1);
  });

  it("should insert tracks with insertAt", function() {
    var origLen = this.sqcr.queue.length;
    var tracksLen = this.trackJSONs.length;

    // Add all but the last one, and add that one as the first new one
    for (var i = 0; i < tracksLen - 1; i++) {
      this.sqcr.push(this.trackJSONs[i]);
    }
    
    this.sqcr.insertAt(this.trackJSONs[tracksLen - 1], origLen);

    var firstTrack = this.sqcr.queue.at(origLen);
    expect(firstTrack.toJSON()).toEqual(this.trackJSONs[tracksLen - 1]);
    
    for (var i = 1; i < tracksLen; i++) {
      var iTrack = this.sqcr.queue.at(origLen + i);
      expect(iTrack.toJSON()).toEqual(this.trackJSONs[i - 1]);
    }
  });

  it("should insert some tracks with insertSomeAt", function() {
    var origLen = this.sqcr.queue.length;
    var tracksLen = this.trackJSONs.length;
    
    this.sqcr.insertSomeAt(this.trackJSONs, origLen);
    
    for (var i = 0; i < tracksLen; i++) {
      var iTrack = this.sqcr.queue.at(origLen + i);
      expect(iTrack.toJSON()).toEqual(this.trackJSONs[i]);
    }
  });

  it("should retrieve the correct track with getAt", function() {
    var origLen = this.sqcr.queue.length;
    this.sqcr.insertSomeAt(this.trackJSONs, origLen);
    
    for (var i = 0; i < this.sqcr.queue.length; i++) {
      expect(this.sqcr.queue.at(i).toJSON())
            .toEqual(this.sqcr.getAt(i).toJSON());
    }
  });

  it("should remove a track with remove", function() {
    var origLen = this.sqcr.queue.length;

    this.sqcr.insertSomeAt(this.trackJSONs, origLen);

    this.sqcr.remove(origLen + 1);

    var firstTrack = this.sqcr.queue.at(origLen);
    expect(firstTrack.toJSON()).toEqual(this.trackJSONs[0]);

    var secondTrack = this.sqcr.queue.at(origLen + 1);
    expect(secondTrack.toJSON()).toEqual(this.trackJSONs[2]);
  });
  
  it("should call pushView when a track is removed", function() {
    var spy = spyOn(this.Einplayer.Backend.MessageHandler, "pushView")
                   .andCallThrough();

    this.sqcr.push(this.trackJSONs[0]);
    this.sqcr.remove(0);
    
    expect(spy).toHaveBeenCalled();
    expect(spy.callCount).toEqual(2);
  });

  it("should clear with clear()", function() {
    var origLen = this.sqcr.queue.length;

    this.sqcr.insertSomeAt(this.trackJSONs, 0);

    expect(this.sqcr.queue.length).toEqual(origLen + this.trackJSONs.length);

    this.sqcr.clear();
    expect(this.sqcr.queue.length).toEqual(0);
  });
  
  it("should call pushView when tracks are cleared", function() {
    var origLen = this.sqcr.queue.length;
    var spy = spyOn(this.Einplayer.Backend.MessageHandler, "pushView")
                   .andCallThrough();

    this.sqcr.insertSomeAt(this.trackJSONs, origLen);
    this.sqcr.clear();

    // expect the spy to be called once for each added track and once
    // more for the clear
    expect(spy).toHaveBeenCalled();
    expect(spy.callCount).toEqual(this.trackJSONs.length + 1);
  });

});
