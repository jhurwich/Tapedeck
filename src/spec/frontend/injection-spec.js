describe("After content-scripts are injected", function() {

  beforeEach(function() {
  });

  it("should have the sidebar buttons", function() {
    expect($('#tapedeck-injected-buttons')).toExist();
    expect($('#tapedeck-injected-draweropen')).toExist();
    expect($('#tapedeck-injected-drawerclose')).toExist();
    expect($('#tapedeck-injected-play')).toExist();
    expect($('#tapedeck-injected-next')).toExist();
    expect($('#tapedeck-injected-prev')).toExist();
  });

  it("should have the tapedeck iframe", function() {
    expect($("#tapedeck-frame")).toExist();
  });

  it("should render the Frame view into the iframe", function() {
    // we need to give Tapedeck.Frontend.init time to run
    waitsForFrontendInit();
    runs(function() {
      expect($("#tapedeck-frame").contents()).toContain("#player");
    });
  });

  it("should open the drawer when draweropen is clicked", function() {
    expect($("#tapedeck-injected-draweropen")).toExist();
    $("#tapedeck-injected-draweropen").click();

    expect($("body").attr("tapedeck-opened")).toBeTruthy();

    expect($("#tapedeck-frame")).toExist();
    expect($("#tapedeck-frame")).not.toBeHidden();

    expect($("#tapedeck-injected-draweropen")).toBeHidden();

    expect($("#tapedeck-injected-drawerclose")).toExist();
    expect($("#tapedeck-injected-drawerclose")).not.toBeHidden();
  });

  it("should close the drawer when drawerclose is clicked", function() {
    expect($("#tapedeck-injected-drawerclose")).toExist();
    $("#tapedeck-injected-drawerclose").click();

    expect($("body").attr("tapedeck-opened")).not.toBeTruthy();

    expect($("#tapedeck-frame")).toExist();
    expect($("#tapedeck-frame")).toBeHidden();

    expect($("#tapedeck-injected-drawerclose")).toBeHidden();

    expect($("#tapedeck-injected-draweropen")).toExist();
    expect($("#tapedeck-injected-draweropen")).not.toBeHidden();
  });
});

