describe("CassetteList View", function() {

  beforeEach(function() {
    this.cassetteMgr = this.Tapedeck
                           .Backend
                           .CassetteManager;
    this.cassettes = this.cassetteMgr.cassettes;
  });

  it ("should have rows for each cassette when rendered", function() {
    var cassetteList = new this.Tapedeck
                               .Backend
                               .Collections
                               .CassetteList(this.cassettes);
                               
    var viewScript = this.Tapedeck
                         .Backend
                         .TemplateManager
                         .getViewScript("CassetteList");
                         
    var view = new viewScript({ cassetteList: cassetteList });
    var listDOM = view.render();
    
    var rows  = $(listDOM).find(".row");
    
    expect(rows.length).toEqual(this.cassettes.length);
  });
  
  it ("should render properly through the TemplateManager", function() {
    var cassetteList = new this.Tapedeck
                               .Backend
                               .Collections
                               .CassetteList(this.cassettes);
    
    var listDOM = this.Tapedeck.Backend.TemplateManager.renderView
                      ("CassetteList", { cassetteList: cassetteList }, null);
    
    var rows  = $(listDOM).find(".row");

    expect(rows.length).toEqual(this.cassettes.length);
  });
});
