Tapedeck.Backend.CassetteManager = {

  cassettes: [],
  currentCassette: null,
  currPage: 1,
  
  init: function(continueInit) {
    var cMgr = Tapedeck.Backend.CassetteManager;
    cMgr.cassettes = []; // array of { cassette : __, (page: __) }
    cMgr.readInCassettes(function() {
      if (cMgr.currentCassette == null) {
        var saved = Tapedeck.Backend.Bank.getCurrentCassette();
        cMgr.setCassette(saved);
      }
      window.setInterval(cMgr.dumpCollector, 1000 * 60 * 2 /* 2 min */);
      continueInit();
    });
  },

  readInCassettes: function(callback) {
    var cMgr = Tapedeck.Backend.CassetteManager;
    cMgr.cassettes = [];

    // Read saved cassettes into memory
    Tapedeck.Backend.Bank.FileSystem.getCassettes(function(cassetteDatas) {
      var pageMap = { };
      for (var i = 0; i < cassetteDatas.length; i++) {
        var data = cassetteDatas[i];

        if (typeof(data.page) != "undefined") {
          pageMap[data.name] = data.page
        }
        // writes the cassette to Tapedeck.Backend.Cassettes[CassetteName]
        new Function(data.code)();
      }

      for (var CassetteModel in Tapedeck.Backend.Cassettes) {
        var cassette = new Tapedeck.Backend.Cassettes[CassetteModel]();
        if (typeof(pageMap[CassetteModel]) != "undefined") {
          cMgr.cassettes.push({ cassette : cassette,
                                page     : parseInt(pageMap[CassetteModel]) });
        }
        else {
          cMgr.cassettes.push({ cassette: cassette });
        }
      }
      callback();
    });
  },

  refreshCassetteListView: function() {
    var cMgr = Tapedeck.Backend.CassetteManager;
    cMgr.readInCassettes(function() {
      var cassetteListView =
        Tapedeck.Backend.TemplateManager.renderView
                ("CassetteList",
                 { cassetteList : cMgr.getCassettes() });
      
      Tapedeck.Backend.MessageHandler.pushView("cassette-list",
                                               cassetteListView);
    });
  },

  setCassette: function(name) {
    var oldCurrent = this.currentCassette;
    this.currPage = 1;

    // Find the specified cassette, or if it was null set the cassette
    // to null, 'ejecting' it.
    if (typeof(name) == "undefined" ||
        name == null ||
        name.length == 0) {
      this.currentCassette = null;
    }
    else {
      for (var i = 0; i < this.cassettes.length; i++) {
        var cassette = this.cassettes[i].cassette;
        if (cassette.get("name") == name) {
          this.currentCassette = cassette;
          this.currentCassette.set({ active: "active" });
          
          if (typeof(this.cassettes[i].page) != "undefined") {
            this.currPage = parseInt(this.cassettes[i].page);
          }
        }
      }
    }
    
    // If the current cassette changes, we need to save the new 
    // cassette's id and update the browse region.
    if (this.currentCassette != oldCurrent) {
      var cassetteName = "";
      if (this.currentCassette != null) {
        cassetteName = this.currentCassette.get("name") 
      }
      if(oldCurrent != null) {
        oldCurrent.unset("active");
      }
      Tapedeck.Backend.Bank.saveCurrentCassette(cassetteName);
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

  removeCassette: function(name) {
    var cMgr = Tapedeck.Backend.CassetteManager;
    
    var foundCassette = null;
    for (var i = 0; i < cMgr.cassettes.length; i++) {
      var cassette = cMgr.cassettes[i].cassette;
      if (cassette.get("name") == name) {
        foundCassette = cassette;
        cMgr.cassettes.splice(i, 1);
        break;
      }
    }
    
    delete Tapedeck.Backend.Cassettes[name];
    Tapedeck.Backend.Bank.FileSystem.removeCassette(name, function() {
      cMgr.refreshCassetteListView();
    });
    
  },

  getCassettes: function() {
    var cMgr = Tapedeck.Backend.CassetteManager;
    var cassettes = _.pluck(cMgr.cassettes, "cassette");
    return new Tapedeck.Backend.Collections.CassetteList(cassettes);
  },

  browsePrevPage: function() {
    if (this.currentCassette != null) {
      this.setPage(this.currPage - 1);
    }
  },
  browseNextPage: function() {
    if (this.currentCassette != null) {
      this.setPage(this.currPage + 1);
    }
  },
  setPage: function(page) {
    var cMgr = Tapedeck.Backend.CassetteManager;
    if (cMgr.currPage == parseInt(page)) {
      return;
    }
    cMgr.currPage = parseInt(page);
    if (cMgr.currPage < 1) {
      cMgr.currPage = 1;
    }
    
    // this triggers the loading browseList state
    Tapedeck.Backend.MessageHandler.pushBrowseTrackList(null);

    // update the page in memory
    for (var i = 0; i < cMgr.cassettes.length; i++) {
      var cassette = cMgr.cassettes[i].cassette;
      if (cassette.get("name") == cMgr.currentCassette.get("name")) {
        cMgr.cassettes[i].page = cMgr.currPage;
      }
    }

    // change to the new page in the frontend
    Tapedeck.Backend.MessageHandler.updateBrowseList();

    // save the page to persist
    Tapedeck.Backend.Bank.saveCassettePage(cMgr.currentCassette.get("name"),
                                           cMgr.currPage);
  },

  // cassettify() is called in a series of phases.
  // The 'start' phase will always begin the cassettify process,
  // potentially cancelling a previous cassettify in progress.
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
              text          : "Please enter the url for a site with '$#' for the page number." },
            { type          : "info",
              text          : "For example: theburningear.com/page/$#" },
            { type          : "input",
              text          : "",
              width         : "300",
              callbackParam : "pattern" },
          ],
          title: "Cassettify Wizard",
        }, self.handlePatternInput, self.postLoadCleanup);
        
        // injectMgr.registerPostInjectScript(self.tabID, self.captureNextLoad); SAVE_FOR_CAPTURE_NEXT_LOAD
      });
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
      
      var index = pattern.indexOf("$#");
      if (index == -1) {
        // couldn't find the pattern
        msgHandler.showModal({
          fields: [
            { type          : "info",
              text          : "Couldn't find '$#' please try again.", },
            { type          : "info",
              text          : "Please enter the url for a site with '$#' for the page number." },
            { type          : "info",
              text          : "For example: theburningear.com/page/$#" },
            { type          : "input",
              text          : "",
              width         : "300",
              callbackParam : "pattern" },
          ],
          title: "Cassettify Wizard",
        }, self.handlePatternInput, self.postLoadCleanup);
        return;
      }

      var template = _.template(cMgr.CassettifyTemplate.template);

      pattern = pattern.replace("http://", "");
      pattern = pattern.replace("www.", "");
      var domain;
      if (pattern.indexOf('/') != -1) {
        domain = pattern.substring(0, pattern.indexOf('/'));
      }
      else {
        domain = pattern;
      }
      
      var modelLoader = template({ domain  : domain,
                                   pattern : pattern });

      cMgr.Cassettify.nameCassette(modelLoader);
    },

    nameCassette: function(code, msg) {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var cMgr = Tapedeck.Backend.CassetteManager;
      
      var nameAndSaveCassette = function(params) {
        if (params.cassetteName.length == 0) {
          cMgr.Cassettify.nameCassette(code, "You must enter a name");
          return;
        }

        // any non-a-Z,0-9, or space
        if ((/[^a-zA-Z0-9\s]/).test(params.cassetteName)) {
          cMgr.Cassettify.nameCassette(code, "Only a-Z, 0-9, and spaces are allowed.");
          return;
        }
        var saveableName = params.cassetteName.replace(/\s/g, "_");
        
        if (typeof(Tapedeck.Backend.Cassettes[saveableName]) != "undefined") {
          cMgr.Cassettify.nameCassette(code, "The name you enterred is in use");
          return;
        }

        code = code.replace(/CassetteFromTemplate/g,
                            saveableName);
        code = code.replace(/Unnamed/g, saveableName);
        
        Tapedeck.Backend.Bank.FileSystem.saveCassette(code,
                                                      saveableName,
                                                      cMgr.Cassettify.finish);
      };

      var modalFields = [];
      if (typeof(msg) != "undefined") {
        modalFields.push({ type : "info",
                           text : msg });
      }
      modalFields.push({ type          : "info",
                         text          : "Name your new cassette",});
      modalFields.push({ type          : "input",
                         text          : "",
                         callbackParam : "cassetteName"  });

      msgHandler.showModal({
        fields: modalFields,
        title: "Cassettify Wizard",
      }, nameAndSaveCassette);
    },

    finish: function(success) {
      var cMgr = Tapedeck.Backend.CassetteManager;
      if(success) {
        cMgr.refreshCassetteListView();
      }
      else {
        console.error("Cassette could not be properly saved");
      }
    },


/* SAVE_FOR_CAPTURE_NEXT_LOAD
*    captureNextLoad: function(context) {
*      var msgHandler = Tapedeck.Backend.MessageHandler;
*      var injectMgr = Tapedeck.Backend.InjectManager;
*      
*      if (context.tab.url != self.origURL) {
*        // loaded a new page
*        self.secondURL = context.tab.url;
*        msgHandler.showModal({
*          fields: [
*            { type          : "info",
*              text          : "Got a second page of '" +
*                              self.secondURL + "'." },
*          ],
*          title: "Cassettify Wizard 2",
*        });
*        
*        Tapedeck.Backend.CassetteManager.Cassettify.postLoadCleanup();
*      }
*      else {
*        // same page loaded
*        Tapedeck.Backend.CassetteManager.Cassettify.postLoadCleanup();
*      }
*    },
*/
    postLoadCleanup: function() {
    /*  SAVE_FOR_CAPTURE_NEXT_LOAD
     *  var injectMgr = Tapedeck.Backend.InjectManager;
     *  var cassettify = Tapedeck.Backend.CassetteManager.Cassettify;
     *  injectMgr.removePostInjectScript(cassettify.tabID,
     *                                   cassettify.captureNextLoad);
     */
    },
  },
  
  dumpCollector: function() {
    $("[expiry]").each(function(index, expire) {
      var expiry = parseInt($(expire).attr("expiry"));
      
      if ((expiry - (new Date()).getTime()) < 0) {
        $(expire).remove();
      }
    });
  },
};
