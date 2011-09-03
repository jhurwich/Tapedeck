describe("Abstract/Concrete Cassette Models", function () {

  beforeEach(function() {
    this.TestConcreteCassette = this.Einplayer.Backend.Models.Cassette.extend({

    });
    this.testCassette = new this.TestConcreteCassette();
  });

  it("should inherit the methods of the abstract cassette", function() {
    for (var attr in this.Einplayer.Backend.Models.Cassette) {
      expect(attr in this.TestConcreteCassette).toBeTruthy();
    }
  });
});
