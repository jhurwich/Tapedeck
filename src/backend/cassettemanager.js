Tapedeck.Backend.CassetteManager = {

  cassettes: [],
  currentCassette: null,
  
  init: function(continueInit) {
    var cMgr = Tapedeck.Backend.CassetteManager;
    cMgr.cassettes = [];
    cMgr.readInCassettes(function() {
      if (cMgr.currentCassette == null) {
        var saved = Tapedeck.Backend.Bank.getCurrentCassette();
        cMgr.setCassette(saved);
      }
      continueInit();
    });
  },

  readInCassettes: function(callback) {
    var cMgr = Tapedeck.Backend.CassetteManager;
    cMgr.cassettes = [];

    // Read saved cassettes into memory
    Tapedeck.Backend.Bank.FileSystem.getCassettes(function(cassetteDatas) {
      for (var i = 0; i < cassetteDatas.length; i++) {
        var data = cassetteDatas[i];
        console.log(JSON.stringify(data));

        // writes the cassette to Tapedeck.Backend.Cassettes[CassetteName]
        new Function(data.code)();
      }

      for (var CassetteModel in Tapedeck.Backend.Cassettes) {
        var cassette = new Tapedeck.Backend.Cassettes[CassetteModel]();
        cMgr.cassettes.push(cassette);
      }
      callback();
    });
    
    // Read in provided cassettes


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
    console.log("RETRIEVING " + this.cassettes.length);
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
        self.tabID = tab.id;

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
        }, self.handlePatternInput, self.postLoadCleanup);
        injectMgr.registerPostInjectScript(self.tabID, self.captureNextLoad);
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
        
        Tapedeck.Backend.CassetteManager.Cassettify.postLoadCleanup();
      }
      else {
        // same page loaded
        Tapedeck.Backend.CassetteManager.Cassettify.postLoadCleanup();
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

      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      self.postLoadCleanup();
      
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
      if (domain.indexOf('/') != -1) {
        domain = domain.substring(0, domain.indexOf('/'));
      }
      
      var modelLoader = template({ domain  : domain,
                                   pattern : pattern });

      cMgr.Cassettify.nameCassette(modelLoader);
    },

    nameCassette: function(code, msg) {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var cMgr = Tapedeck.Backend.CassetteManager;
      
      var nameAndSaveCassette = function(params) {
        var saveableName = params.cassetteName.replace(" ", "_");
        if (saveableName.length == 0) {
          cMgr.Cassettify.nameCassette(code, "You must enter a name");
          return;
        }
        
        if (typeof(Tapedeck.Backend.Cassettes[saveableName]) != "undefined") {
          cMgr.Cassettify.nameCassette(code, "The name you enterred is in use");
          return;
        }

        code = code.replace(/CassetteFromTemplate/g,
                            saveableName);

        code = code.replace(/Unnamed/g, params.cassetteName);
                                          
        Tapedeck.Backend.Bank.FileSystem.saveCassette(code,
                                                      saveableName,
                                                      cMgr.Cassettify.finish);
      };

      var modalFields = [];
      if (typeof(msg) != "undefined") {
        modalFields.push({ type : "info",
                           text : msg });
      }
      modalFields.push({ type          : "input",
                         text          : "Name your new cassette",
                         callbackParam : "cassetteName"  });

      msgHandler.showModal({
        fields: modalFields,
        title: "Cassettify Wizard",
      }, nameAndSaveCassette);
    },

    finish: function(success) {
      var cMgr = Tapedeck.Backend.CassetteManager;
      if(success) {
        console.log("reading in all cassettes");
        cMgr.readInCassettes(function() {
          var cassetteListView =
            Tapedeck.Backend.TemplateManager.renderView
                    ("CassetteList",
                     { cassetteList : cMgr.getCassettes() });
          
          Tapedeck.Backend.MessageHandler.pushView("cassette-list",
                                                   cassetteListView);
        });
      }
      else {
        console.error("Cassette could not be properly saved");
      }
    },

    postLoadCleanup: function() {
      var injectMgr = Tapedeck.Backend.InjectManager;
      var cassettify = Tapedeck.Backend.CassetteManager.Cassettify;
      injectMgr.removePostInjectScript(cassettify.tabID,
                                       cassettify.captureNextLoad);
    },
  },
};
