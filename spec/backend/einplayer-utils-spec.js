describe("Utils", function() {

  beforeEach(function() {
    waitsForFrontendInit();
  });

  it("should get the current context", function() {
    var testComplete = false;
    var currentURL = window.location.href;
    
    var testTab = this.findTestTab();
    var context = this.Einplayer.Backend.Utils.getContext(testTab);

    expect(context.tab.id).toEqual(testTab.id);
  });

});
