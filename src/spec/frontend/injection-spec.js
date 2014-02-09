describe("After content-scripts are injected", function() {

  beforeEach(function() {
    this.waitsForFrontendInit();
  });

  it("should have the tapedeck iframe", function() {
    expect($("#tapedeck-frame")).toExist();
  });

  it("should render the Frame view into the iframe", function() {
    // we need to give Tapedeck.Frontend.init time to run
    runs(function() {
      expect($("#tapedeck-frame").contents().find("body").first()).toContain("#player");
    });
  });

  it("should open the drawer", function() {
    var testComplete = false;

    expect($("body").attr("tapedeck-opened")).not.toBeTruthy();
    this.Tapedeck.Frontend.Frame.openDrawer(function() {
      expect($("body").attr("tapedeck-opened")).toBeTruthy();
      testComplete = true;
    });

    waitsFor(function() { return testComplete; }, "Waiting for opening", 2000);
    runs(function() {
      expect(testComplete).toBeTruthy();
    });
  });

  it("should close the drawer", function() {
    var testComplete = false;

    expect($("body").attr("tapedeck-opened")).toBeTruthy();
    this.Tapedeck.Frontend.Frame.closeDrawer(function() {
      expect($("body").attr("tapedeck-opned")).not.toBeTruthy();
      testComplete = true;
    });

    waitsFor(function() { return testComplete; }, "Waiting for closing", 2000);
    runs(function() {
      expect(testComplete).toBeTruthy();
    });
  });
});

