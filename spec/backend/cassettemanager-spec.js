describe("Cassette Manager", function() {

  beforeEach(function() {
    this.cassetteMgr = this.Einplayer
                           .Backend
                           .CassetteManager;
  });

  it("should return all installed cassettes", function() {
    var cassettes = this.cassetteMgr.cassettes;
    var cassetteCount = 0;
    for (var cassetteName in this.Einplayer.Backend.Cassettes) {
      cassetteCount++;
    }
    expect(cassettes.length).toEqual(cassetteCount);
  });

  it("should instantiate all cassette models on init", function() {
    var spies = [];
    for (var cassetteName in this.Einplayer.Backend.Cassettes) {

      var cassettePrototype = this.Einplayer
                                  .Backend
                                  .Cassettes[cassetteName]
                                  .prototype;
      var cassetteSpy = spyOn(cassettePrototype, "initialize")
                             .andCallThrough();
    }

    this.Einplayer.Backend.CassetteManager.init();

    for (var i = 0; i < spies.length; i++) {
      expect(spies[i]).toHaveBeenCalled();
      expect(spies[i].callCount).toEqual(1);
    }
  });

  it("should set the currentCassette with setCassette", function() {
    var cassettes = this.cassetteMgr.cassettes;
    var cassette;
    for (var i = 0; i < cassettes.length; i++) {
      cassette = cassettes[i];
      if (cassette.name = "Scraper") {
        break;
      }
    }
    this.cassetteMgr.setCassette(cassette.cid);
    expect(this.cassetteMgr.currentCassette.name).toEqual("Scraper");
  });

});
