describe("Sequencer", function() {

  beforeEach(function() {
    this.sqcr = this.Tapedeck.Backend.Sequencer;

    waitsFor(function() {
      return this.sqcr.getCurrentState() != null;
    }, "Timed out waiting for Sequencer init", 1000);
  });

  it("should be instantialized and initialized", function() {
    expect(this.sqcr).toBeDefined();
    expect(this.sqcr.getCurrentState()).toBeDefined();
    expect(this.sqcr.queue).toBeDefined();
  });

  it("should add tracks with push", function() {
    var origLen = this.sqcr.queue.length;

    this.sqcr.push(this.testTracks[0]);

    expect(this.sqcr.queue.length).toEqual(origLen + 1);
  });

  it("should call renderViewAndPush when a track is added", function() {
    var spy = spyOn(this.Tapedeck.Backend.TemplateManager, "renderViewAndPush")
                   .andCallThrough();

    this.sqcr.push(this.testTracks[0]);
    expect(spy).toHaveBeenCalled();
  });

  it("should insert tracks with insertAt", function() {
    var origLen = this.sqcr.queue.length;
    var tracksLen = this.testTracks.length;

    // Add all but the last one, and add that one as the first new one
    for (var i = 0; i < tracksLen - 1; i++) {
      this.sqcr.push(this.testTracks[i]);
    }

    this.sqcr.insertAt(this.testTracks[tracksLen - 1], origLen);

    var firstTrack = this.sqcr.queue.at(origLen);
    expect(firstTrack).toReflectJSON(this.testTracks[tracksLen - 1]);

    for (var i = 1; i < tracksLen; i++) {
      var iTrack = this.sqcr.queue.at(origLen + i);
      expect(iTrack).toReflectJSON(this.testTracks[i - 1]);
    }
  });

  it("should insert some tracks with insertSomeAt", function() {
    var origLen = this.sqcr.queue.length;
    var tracksLen = this.testTracks.length;

    this.sqcr.insertSomeAt(this.testTracks, origLen);

    for (var i = 0; i < tracksLen; i++) {
      var iTrack = this.sqcr.queue.at(origLen + i);
      expect(iTrack).toReflectJSON(this.testTracks[i]);
    }
  });

  it("should retrieve the correct track with getAt", function() {
    var origLen = this.sqcr.queue.length;
    this.sqcr.insertSomeAt(this.testTracks, origLen);

    for (var i = 0; i < this.sqcr.queue.length; i++) {
      expect(this.sqcr.queue.at(i).toJSON())
            .toEqual(this.sqcr.getAt(i).toJSON());
    }
  });

  it("should remove a track with remove", function() {
    var origLen = this.sqcr.queue.length;

    this.sqcr.insertSomeAt(this.testTracks, origLen);

    this.sqcr.removeAt(origLen + 1);

    var firstTrack = this.sqcr.queue.at(origLen);
    expect(firstTrack).toReflectJSON(this.testTracks[0]);

    var secondTrack = this.sqcr.queue.at(origLen + 1);
    expect(secondTrack).toReflectJSON(this.testTracks[2]);
  });

  it("should call renderViewAndPush when a track is removed", function() {
    this.sqcr.push(this.testTracks[0]);

    var spy = spyOn(this.Tapedeck.Backend.TemplateManager, "renderViewAndPush")
                   .andCallThrough();
    this.sqcr.removeAt(0);

    expect(spy).toHaveBeenCalled();
  });

  it("should clear with clear()", function() {
    var origLen = this.sqcr.queue.length;

    this.sqcr.insertSomeAt(this.testTracks, 0);

    expect(this.sqcr.queue.length).toEqual(origLen + this.testTracks.length);

    this.sqcr.clear();
    expect(this.sqcr.queue.length).toEqual(0);
  });

  it("should call renderViewAndPush when tracks are cleared", function() {
    var origLen = this.sqcr.queue.length;
    var spy = spyOn(this.Tapedeck.Backend.TemplateManager, "renderViewAndPush")
                   .andCallThrough();

    this.sqcr.insertSomeAt(this.testTracks, origLen);
    this.sqcr.clear();

    expect(spy).toHaveBeenCalled();
  });

});
