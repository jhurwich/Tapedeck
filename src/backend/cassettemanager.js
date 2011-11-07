Tapedeck.Backend.CassetteManager = {

  cassettes: [],
  currentCassette: null,
  
  init: function() {
    this.cassettes = [];
    this.readInCassettes();
    if (this.currentCassette == null) {
      var saved = Tapedeck.Backend.Bank.getCurrentCassette();
      this.setCassette(saved);
    }
  },

  readInCassettes: function() {
    for (var CassetteModel in Tapedeck.Backend.Cassettes) {
      var cassette = new Tapedeck.Backend.Cassettes[CassetteModel]();
      this.cassettes.push(cassette);
    }
  },

  setCassette: function(id) {
    var oldCurrent = this.currentCassette;

    // Find the specified cassette, or if it was null set the cassette
    // to null, 'ejecting' it.
    if (typeof(id) == "undefined" ||
        id == null ||
        id.length == 0) {
      this.currentCassette = null;
    }
    else {
      for (var i = 0; i < this.cassettes.length; i++) {
        var cassette = this.cassettes[i];
        if (cassette.get("tdID") == id) {
          this.currentCassette = cassette;
        }
      }
    }

    // If the current cassette changes, we need to save the new 
    // cassette's id and update the browse region.
    if (this.currentCassette != oldCurrent) {
      var cassetteID = "";
      if (this.currentCassette != null) {
        cassetteID = this.currentCassette.get("tdID") 
      }
      Tapedeck.Backend.Bank.saveCurrentCassette(cassetteID);
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        var browseRegionView = Tapedeck.Backend
                                       .TemplateManager
                                       .renderView("BrowseRegion",
                                                   { tabID : selectedTab.id });
    
        Tapedeck.Backend.MessageHandler.pushView("browse-region",
                                                 browseRegionView);
      });
    }
  },

  getCassettes: function() {
    return new Tapedeck.Backend.Collections.CassetteList(this.cassettes);
  },

};
