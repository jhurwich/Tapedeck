describe("After content-scripts are injected", function() {
  
  beforeEach(function() {
  });

  it("should have the sidebar buttons", function() {
    expect($('#ein-injected-buttons')).toExist();
    expect($('#ein-injected-draweropen')).toExist();
    expect($('#ein-injected-drawerclose')).toExist();
    expect($('#ein-injected-play')).toExist();
    expect($('#ein-injected-next')).toExist();
    expect($('#ein-injected-prev')).toExist();
  });

  it("should have the einplayer iframe", function() {
    expect($("#einplayer-frame")).toExist();
  });

  it("should render the Player view into the iframe", function() {
    // we need to give Einplayer.Frontend.init time to run
    waitsForFrontendInit();
    runs(function() {
      expect($("#einplayer-frame").contents()).toContain(".player");
    });
  });

  it("should open the drawer when draweropen is clicked", function() {
    expect($("#ein-injected-draweropen")).toExist();
    $("#ein-injected-draweropen").click();

    expect($("body").attr("einplayer-opened")).toBeTruthy();
    
    expect($("#einplayer-frame")).toExist();
    expect($("#einplayer-frame")).not.toBeHidden();

    expect($("#ein-injected-draweropen")).toBeHidden();
    
    expect($("#ein-injected-drawerclose")).toExist();
    expect($("#ein-injected-drawerclose")).not.toBeHidden();
  });

  it("should close the drawer when drawerclose is clicked", function() {
    expect($("#ein-injected-drawerclose")).toExist();
    $("#ein-injected-drawerclose").click();

    expect($("body").attr("einplayer-opened")).not.toBeTruthy();
    
    expect($("#einplayer-frame")).toExist();
    expect($("#einplayer-frame")).toBeHidden();

    expect($("#ein-injected-drawerclose")).toBeHidden();
    
    expect($("#ein-injected-draweropen")).toExist();
    expect($("#ein-injected-draweropen")).not.toBeHidden();
  });
});

