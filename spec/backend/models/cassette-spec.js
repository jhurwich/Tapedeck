describe("Abstract/Concrete Cassette Models", function () {

  beforeEach(function() {
    this.TestConcreteCassette = this.Tapedeck.Backend.Models.Cassette.extend({

    });
    this.testCassette = new this.TestConcreteCassette();
  });

  it("should inherit the methods of the abstract cassette", function() {
    for (var attr in this.Tapedeck.Backend.Models.Cassette) {
      expect(attr in this.TestConcreteCassette).toBeTruthy();
    }
  });
});
