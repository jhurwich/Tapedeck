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

  // cassettify() is called in a series of phases.
  // The 'start' phase will always begin the cassettify process,
  // potentially cancelling a previous cassettify in progress.
  //
  // sendResponse can be passed an object containing return values
  origURL: "",
  secondURL: "",
  cassettify: function(options, sendResponse) {
    var self = this;
    var msgHandler = Tapedeck.Backend.MessageHandler;
    var injectMgr = Tapedeck.Backend.InjectManager;

    var showModal = function(opts) {
      var newModalView = Tapedeck.Backend
                                 .TemplateManager
                                 .renderView
                                 ("Modal", opts);
      
      msgHandler.pushView("modal", newModalView);
    };

    
    switch(options.phase)
    {
      case "start":
        var startPostLoad = function(context) {
          if (context.tab.url != self.origURL) {
            // loaded a new page
            self.secondURL = context.tab.url;
            showModal({
              fields: [
                { type          : "info",
                  text          : "Got a second page of '" +
                                  self.secondURL + "'." },
              ],
              title: "Cassettify Wizard 2",
            });
            
            injectMgr.removePostInjectScript(context.tab.id, arguments.callee);
          }
          else {
            // same page loaded
            injectMgr.removePostInjectScript(context.tab.id, arguments.callee);
          }
        }; // end startPostLoad
        
        msgHandler.getSelectedTab(function(tab) {
          self.origURL = tab.url;
          showModal({
            fields: [
              { type          : "info",
                text          : "Please browse to previous page of '" +
                                self.origURL + "'." },
              { type          : "input",
                text          : "or enter pattern with '$#' for page number.",
                callbackParam : "pattern" },
            ],
            title: "Cassettify Wizard",
          });
          injectMgr.registerPostInjectScript(tab.id, startPostLoad);
          
          sendResponse({ url : tab.url });
        });
        break;
          
      case "secondPage":
        msgHandler.getSelectedTab(function(tab) {
          self.secondURL = tab.url;
          sendResponse({ url : tab.url });
        });
        break;

      default:
        console.error("Unrecognized phase in cassettify");
        break;
    }
  },

};
