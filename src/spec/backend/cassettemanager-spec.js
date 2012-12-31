describe("Cassette Manager", function() {

  beforeEach(function() {
    this.cassetteMgr = this.Tapedeck
                           .Backend
                           .CassetteManager;

    this.waitsForBackendInit();
  });

  it("should instantiate all cassette models on init", function() {
    var spies = [];
    for (var cassetteName in this.Tapedeck.Backend.Cassettes) {

      var cassettePrototype = this.Tapedeck
                                  .Backend
                                  .Cassettes[cassetteName]
                                  .prototype;
      var cassetteSpy = spyOn(cassettePrototype, "initialize")
                             .andCallThrough();
    }

    this.Tapedeck.Backend.CassetteManager.init(function() {

      for (var i = 0; i < spies.length; i++) {
        expect(spies[i]).toHaveBeenCalled();
        expect(spies[i].callCount).toEqual(1);
      }
    });
  });

  it("should set the currentCassette with setCassette", function() {
    var cassettes = this.cassetteMgr.cassettes;
    var cassette;
    for (var i = 0; i < cassettes.length; i++) {
      cassette = cassettes[i].cassette;
      if (cassette.get("name") == "Scraper") {
        break;
      }
    }

    this.cassetteMgr.setCassette(cassette.get("name"));
    expect(this.cassetteMgr.currentCassette.get("name")).toEqual("Scraper");
  });

});
