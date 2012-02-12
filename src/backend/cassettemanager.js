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
  Cassettify: {

    start: function() {
      var self = this;
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var injectMgr = Tapedeck.Backend.InjectManager;
          
      msgHandler.getSelectedTab(function(tab) {
        self.origURL = tab.url;
        msgHandler.showModal({
          fields: [
            { type          : "info",
              text          : "Please browse to previous page of '" +
                              self.origURL + "'." },
            { type          : "input",
              text          : "or enter pattern with '$#' for page number.",
              callbackParam : "pattern" },
          ],
          title: "Cassettify Wizard",
        }, self.handlePatternInput);
        injectMgr.registerPostInjectScript(tab.id, self.captureNextLoad);
      });
    },

    captureNextLoad: function(context) {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var injectMgr = Tapedeck.Backend.InjectManager;
      
      if (context.tab.url != self.origURL) {
        // loaded a new page
        self.secondURL = context.tab.url;
        msgHandler.showModal({
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
    },

    handlePatternInput: function(params) {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      msgHandler.showModal({
        fields: [
          { type          : "info",
            text          : "Building Cassette, please wait." },
        ],
        title: "Cassettify Wizard",
      });

      console.log(JSON.stringify(params));
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      
      var pattern = params.pattern;
      /*
      var index = pattern.indexOf("$#");
      if (index == -1) {
        // didn't find the pattern
        return;
      }
      */

      var template = _.template(cMgr.CassettifyTemplate.template);

      var domain = pattern.replace("http://", "");
      domain = domain.replace("www.", "");
      domain = domain.substring(0, domain.indexOf('/'));

      var modelLoader = template({ domain  : "theburningear.com",
                                   pattern : pattern });
      console.log(modelLoader);


      var nameAndSaveCassette = function(params) {
        modelLoader = modelLoader.replace("CassetteFromTemplate",
                                          params.cassetteName);
        Tapedeck.Backend.Bank.FileSystem.saveCassette(modelLoader,
                                                      params.cassetteName,
                                                      cMgr.Cassettify.finish);

        // Run the modelLoader to prepare the new Cassette Model 
        /*
        new Function(modelLoader)();
        
        var newCassette = new Tapedeck.Backend.Cassettes[params.cassetteName]();
        
        cMgr.cassettes.push(newCassette);
        */
      };

      msgHandler.showModal({
        fields: [
          { type          : "input",
            text          : "Name your new cassette",
            callbackParam : "cassetteName"  },
        ],
        title: "Cassettify Wizard",
      }, nameAndSaveCassette);

      // 4. like line above, add cassette to CassetteList and update it
      // 5. save the cassette with the bank
      // 6. make sure saved cassettes are read in see 'readInCassettes()'
            
      for (var i = 0; i < cMgr.cassettes.length; i++) {
        console.log(JSON.stringify(cMgr.cassettes[i].toJSON()));
      }
    },

    finish: function(success) {
      if(success) {
        console.log("Cassette saved");
        Tapedeck.Backend.Bank.FileSystem.getCassettes();
      }
      else {
        console.error("Cassette could not be properly saved");
      }
    },
  },
};
