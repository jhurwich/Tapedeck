Tapedeck.Backend.CassetteManager = {

  cassettes: [],
  currentCassette: null,
  currPage: 1,
  numPreinstalled: 1, // Scraper is preinstalled

  DEBUG_LEVELS: {
    NONE  : 0,
    BASIC : 1,
    ALL   : 2,
  },
  debug: 0,

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
    cMgr.log("Discarding and reading in cassettes.");
    cMgr.cassettes = [];

    // FileSystem cassettes must be run in the Sandbox and communicated with through
    // a CassetteAdapter
    Tapedeck.Backend.Bank.FileSystem.getCassettes(function(cassetteDatas) {
      Tapedeck.Backend.MessageHandler.messageSandbox({ action: 'clearCassettes' }, function() {

        var pageMap = { };
        for (var i = 0; i < cassetteDatas.length; i++) {
          var scoped = function(data) {
            // Extract the code in the filesystem cassette and pass to sandbox to execute
            var xhr = new XMLHttpRequest();
            xhr.open("GET", data.url, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4 && xhr.status == 200) {
                cMgr.log("Sending '" + data.name + "' to sandbox to be prepared.");

                // Tell the Sandbox to prepare this cassette, in the response is a report
                // from which a CassetteAdapter can be created.  Map that adapter as the cassette
                var message = {
                  action: "prepCassette",
                  code: xhr.responseText
                };
                Tapedeck.Backend.MessageHandler.messageSandbox(message, function(response) {
                  var newAdapter = new Tapedeck.Backend.Models.CassetteAdapter(response.report);
                  var cassetteEntry = { cassette: newAdapter };
                  if (typeof(data.page) != "undefined") {
                    cassetteEntry.page = data.page;
                  }
                  if (typeof(data.feed) != "undefined") {
                    cassetteEntry.feed = data.feed;
                  }
                  else if (typeof(response.report.defaultFeed) != "undefined") {
                    cassetteEntry.feed = response.report.defaultFeed;
                  }

                  cMgr.cassettes.push(cassetteEntry);
                });
              }
            }; // end xhr.onreadystatechange
            xhr.send();
          }; // end scoped
          scoped(cassetteDatas[i]);
        } // end handling FileSystem cassettes
      }); // end messageSandbox({ action: 'clearCassettes' ...

      // Cassettes stored in memory can be used directly
      for (var CassetteModel in Tapedeck.Backend.Cassettes) {
        var cassette = new Tapedeck.Backend.Cassettes[CassetteModel]();
        cMgr.log("Loading '" + CassetteModel + "' from memory.");

        // for the moment no in-memory cassettes have pages, if this changes
        // this will need to pull a page number and store it here
        cMgr.cassettes.push({ cassette: cassette });
      }

      // Confirm that everything was ready to be read in.
      // We expect all the preinstalled cassettes plus the saved ones.
      var numExpected = cMgr.numPreinstalled + cassetteDatas.length;
      var currTimeout = 0;
      var maxTimeout = 10000;
      var delayReturn = function() {
        if (cMgr.cassettes.length != numExpected) {
          if (currTimeout <= 0) {
            currTimeout = 1;
          }
          cMgr.log("Read-in not complete [" + currTimeout + "ms]- " + cMgr.cassettes.length + "/" + numExpected);
          currTimeout = currTimeout * 2;

          if (currTimeout > maxTimeout) {
            console.error("Exceeded maxTimeout for reading in cassettes: " +
                          cMgr.cassettes.length + "/" + numExpected + " loaded.");
            callback();
            return;
          }
          setTimeout(delayReturn, currTimeout);
        }
        else {
          cMgr.log("Reading in complete - " + cMgr.cassettes.length + " cassettes loaded.");
          callback();
        }
      }
      delayReturn();
    });
  },

  refreshCassetteListView: function() {
    var cMgr = Tapedeck.Backend.CassetteManager;
    cMgr.readInCassettes(function() {
      Tapedeck.Backend.TemplateManager.renderView("CassetteList", function(cassetteListView) {
        Tapedeck.Backend.MessageHandler.pushView(cassetteListView.el,
                                                 cassetteListView.proxyEvents);
      });
    });
  },

  setCassette: function(name) {
    var oldCurrent = this.currentCassette;
    this.currPage = 1;
    this.currFeed = null;

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
          if (typeof(this.cassettes[i].feed) != "undefined") {
            this.currFeed = this.cassettes[i].feed;
          }
        }
      }
    }

    // If the current cassette changes, we need to save the new
    // cassette's id and update the browse region.
    if (this.currentCassette != oldCurrent) {
      // Change the current cassette
      var cassetteName = "";
      if (this.currentCassette != null) {
        cassetteName = this.currentCassette.get("name")
      }
      if(oldCurrent != null) {
        oldCurrent.unset("active");
      }
      Tapedeck.Backend.Bank.saveCurrentCassette(cassetteName);

      this.log("Switching to cassette: '" + cassetteName + "'");

      // Push the new view
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.TemplateManager.renderView("BrowseRegion", function(browseRegionView) {
          Tapedeck.Backend.MessageHandler.pushView(browseRegionView.el,
                                                   browseRegionView.proxyEvents);
        }, true);
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

  chooseFeed: function(feedName) {
    var cMgr = Tapedeck.Backend.CassetteManager;
    if (typeof(cMgr.currFeed) != "undefined" && cMgr.currFeed != null && cMgr.currFeed == feedName) {
      return;
    }
    cMgr.currFeed = feedName;

    // update the feed in memory
    for (var i = 0; i < cMgr.cassettes.length; i++) {
      var cassette = cMgr.cassettes[i].cassette;
      if (cassette.get("name") == cMgr.currentCassette.get("name")) {
        cMgr.cassettes[i].feed = cMgr.currFeed;
      }
    }

    // change to the new page in the frontend, in the selected tab, with postPopulate
    Tapedeck.Backend.MessageHandler.updateView("BrowseList", true);

    // save the page to persist
    Tapedeck.Backend.Bank.saveCassetteFeed(cMgr.currentCassette.get("name"),
                                           cMgr.currFeed);
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

    // update the page in memory
    for (var i = 0; i < cMgr.cassettes.length; i++) {
      var cassette = cMgr.cassettes[i].cassette;
      if (cassette.get("name") == cMgr.currentCassette.get("name")) {
        cMgr.cassettes[i].page = cMgr.currPage;
      }
    }

    // change to the new page in the frontend, in the selected tab, with postPopulate
    Tapedeck.Backend.MessageHandler.updateView("BrowseList", true);

    // save the page to persist
    Tapedeck.Backend.Bank.saveCassettePage(cMgr.currentCassette.get("name"),
                                           cMgr.currPage);
  },

  // cassettify() is called in a series of phases.
  // The 'start' phase will always begin the cassettify process,
  // potentially cancelling a previous cassettify in progress.
  Cassettify: {
    origURL: "",
    secondURL: "",

    // for guessing page url structures, $@ is replaced with domain, $# with page number
    commonURLPatterns: ["$@/page/$#"],

    // domains that have special handling defined
    exceptionDomains: { "soundcloud.com"  : "handleSoundcloud" },

    start: function(params) {
      var self = this;
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var injectMgr = Tapedeck.Backend.InjectManager;
      if (typeof(params) == "undefined") {
        params = { };
      }

      Tapedeck.Backend.CassetteManager.log("Begin Cassettification");

      msgHandler.getSelectedTab(function(tab) {
        self.origURL = tab.url;
        self.tabID = tab.id;
        if (typeof(params.isTest) != "undefined" && params.isTest) {
          self.origURL = params.testURL;
        }

        console.trace();
        msgHandler.showModal({
          fields: [{ type : "info",
                     text : "Building Cassette, please wait." }],
          submitButtons : [{ text: "Try another site",
                             callbackParam: "anotherSite" },
                           { text: "Advanced",
                             callbackParam: "advanced" }],
          title: "Cassettify",
        }, self.chooseMethod);

        // first check if there's a cassette in the store for this url
        // TODO implement

        // if the store doesn't have anything, try to guess the pattern
        self.guessPattern(self.origURL, tab);
      });
    },

    byURL: function() {
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      var msgHandler = Tapedeck.Backend.MessageHandler;
      msgHandler.showModal({
        fields: [{ type          : "info",
                   text          : "Please enter a site to cassettify." },
                 { type          : "input",
                   text          : "",
                   width         : "300",
                   callbackParam : "url" }],
        submitButtons : [{ text: "Submit",
                           callbackParam: "submit" },
                         { text: "Advanced",
                           callbackParam: "advanced" }],
        title: "Cassettify a Site",
      }, self.handleURLInput, self.postLoadCleanup);
    },

    handleURLInput: function(params) {
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      var msgHandler = Tapedeck.Backend.MessageHandler;
      if (typeof(params.submitButton) != "undefined" && params.submitButton != "submit") {
         if (params.submitButton == "advanced") {
          cMgr.Cassettify.byPattern();
          return;
        }
      }
      cMgr.log("Received cassettification url '" + params.url + "'");

      console.trace();
      msgHandler.showModal({
        fields: [{ type : "info",
                   text : "Building Cassette, please wait." }],
        submitButtons : [{ text: "Try another site",
                           callbackParam: "anotherSite" },
                         { text: "Advanced",
                           callbackParam: "advanced" }],
        title: "Cassettify",
      }, self.chooseMethod);

      self.postLoadCleanup();

      self.guessPattern(params.url, params.tab);
    },

    byPattern: function() {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      msgHandler.showModal({
        fields: [{ type          : "info",
                   text          : "Please enter the url for a site with '$#' for the page number." },
                 { type          : "info",
                   text          : "For example: theburningear.com/page/$#" },
                 { type          : "input",
                   text          : "",
                   width         : "300",
                   callbackParam : "pattern" }],
        title: "Advanced Cassettify",
      }, self.handlePatternInput, self.postLoadCleanup);
    },

    guessPattern: function(url, tab) {
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;

      for (var exceptionDomain in self.exceptionDomains) {
        if (url.indexOf(exceptionDomain) != -1) {
          // we've hit an exception domain, defer to exception handling
          self[self.exceptionDomains[exceptionDomain]](url);
          return
        }
      }

      // not an exception domain, try our guesses
      url = url.replace("http://", "");
      url = url.replace("www.", "");
      domain = url;
      if (url.indexOf('/') != -1) {
        domain = url.substring(0, url.indexOf('/'));
      }
      cMgr.log("Attempting to guess pattern for '" + url + "'");

      // recurse through the commonURLPatterns
      var tryPattern = function(i) {
        if (i >= self.commonURLPatterns.length) {
          // we failed to guess the pattern
          self.fail({ msg: "Could not build a cassette for this site" })
          return;
        }

        var commonURLPattern = self.commonURLPatterns[i];
        var guess = commonURLPattern.replace("$@", domain);

        self.testPattern(domain, guess, tab, function(successResponse) {
          cMgr.log("Success with guess: '" + guess + "'");
          self.handlePatternInput(guess);
        }, function(failResponse) {
          cMgr.log("Failed with guess: '" + guess + "'");
          tryPattern(i + 1)
        });
      };
      tryPattern(0);
    },

    testPattern: function(domain, pattern, tab, successFn, failFn) {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;

      // prevent the cassette from adding new tracks, forcing them to be queued
      msgHandler.addTrackAvailable = false;

      // Use Sandbox to generate the Cassette's source
      var context = Tapedeck.Backend.Utils.getContext(tab);
      var message = {
        action: "testPattern",
        params: { domain: domain, pattern: pattern },
        textTemplate: cMgr.CassettifyTemplate.template,
        context: context
      };
      try {
        msgHandler.messageSandbox(message, function(response) {
          // check if tracks were added using msgHandler.addTracks, though getBrowseList may have failed
          if (msgHandler.addTracksQueued.length > 0) {
            response.success = true;
          }
          msgHandler.addTracksQueueud = [];
          msgHandler.addTrackAvailable = true;

          if (response.success) {
            successFn(response);
          }
          else {
            failFn(response);
          }
        });

      } catch(error) {
        console.error("ERROR in generating Cassette source -" + JSON.stringify(error));
      }
    },

    // param can be an object of params (with params.pattern) or the pattern string
    handlePatternInput: function(params) {
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      var msgHandler = Tapedeck.Backend.MessageHandler;

      console.trace();
      msgHandler.showModal({
        fields: [{ type : "info",
                   text : "Building Cassette, please wait." }],
        submitButtons : [{ text: "Try another site",
                           callbackParam: "anotherSite" },
                         { text: "Advanced",
                           callbackParam: "advanced" }],
        title: "Cassettify",
      }, self.chooseMethod);

      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      self.postLoadCleanup();

      var pattern = params.pattern;
      if (typeof(params) == "string") {
        pattern = params;
      }
      cMgr.log("Received cassettification pattern '" + pattern + "'");

      var index = pattern.indexOf("$#");
      if (index == -1) {
        // couldn't find the pattern
        msgHandler.showModal({
          fields: [{ type          : "info",
                     text          : "Couldn't find '$#' please try again.", },
                   { type          : "info",
                     text          : "Please enter the url for a site with '$#' for the page number." },
                   { type          : "info",
                     text          : "For example: theburningear.com/page/$#" },
                   { type          : "input",
                     text          : "",
                     width         : "300",
                     callbackParam : "pattern" }],
          submitButtons : [{ text: "Submit pattern",
                             callbackParam: "submit" },
                           { text: "Try another site",
                             callbackParam: "anotherSite" },
                           { text: "Advanced",
                             callbackParam: "advanced" }],
          title: "Advanced Cassettify",
        }, self.handlePatternInput, self.postLoadCleanup);
        return;
      }

      // Collect params to generate our Cassette's source
      pattern = pattern.replace("http://", "");
      pattern = pattern.replace("www.", "");
      var domain;
      if (pattern.indexOf('/') != -1) {
        domain = pattern.substring(0, pattern.indexOf('/'));
      }
      else {
        domain = pattern;
      }

      // Use Sandbox to generate the Cassette's source
      var message = {
        action: "template",
        params: { domain: domain, pattern: pattern },
        textTemplate: cMgr.CassettifyTemplate.template
      };
      try {
        Tapedeck.Backend.MessageHandler.messageSandbox(message, function(response) {
          var options = { domain: domain };
          if (response.cassetteName != "undefined") {
            options.cassetteName = response.cassetteName;
          }
          cMgr.Cassettify.nameCassette(response.rendered, options);
        });

      } catch(error) {
        console.error("ERROR in generating Cassette source -" + JSON.stringify(error));
      }

    },

    handleSoundcloud: function(url) {
      this.Soundcloud.cassettify(url);
    },

    Soundcloud : {
      consumerKey: "46785bdeaee8ea7f992b1bd8333c4445",
      cassettify: function(url) {
        var soundcloud = this;
        url = url.replace("http://", "");
        url = url.replace("www.", "");

        soundcloud.isGroup = false;
        var patternBase = "soundcloud.com/"
        if (url.indexOf("soundcloud.com/groups") != -1) {
          soundcloud.isGroup = true;
          patternBase = patternBase + "groups/";
        }

        var entityRegex = new RegExp(patternBase + "([^/]*)")
        soundcloud.entity = url.match(entityRegex)[1];
        soundcloud.domain = "http://www." + patternBase + soundcloud.entity;

        // now determine the entity's soundcloud id with resolve
        var resolveURL = "http://api.soundcloud.com/resolve.json?url=" + soundcloud.domain + "&client_id=";
        resolveURL = resolveURL + soundcloud.consumerKey;
        $.ajax({
          type: "GET",
          url: resolveURL,
          dataType: "json",
          success : function(response) {
            soundcloud.entityID = response.id;

            // Use Sandbox to generate the Cassette's source
            var message = {
              action: "template",
              params: { isGroup : soundcloud.isGroup,
                        entity  : soundcloud.entity,
                        entityID: soundcloud.entityID,
                        domain  : soundcloud.domain },
              textTemplate: Tapedeck.Backend.CassetteManager.SoundcloudTemplate.template
            };
            try {
              Tapedeck.Backend.MessageHandler.messageSandbox(message, soundcloud.finish);

            } catch(error) {
              console.error("ERROR in generating Cassette source -" + JSON.stringify(error));
            }
          },
          error : function(xhr, status) {
            console.error("Error getting Soundcloud entity id: " + domain);
          }
        });
      },

      finish: function(response) {
        var soundcloud = Tapedeck.Backend.CassetteManager.Cassettify.Soundcloud;
        var options = { domain: soundcloud.domain };
        if (response.cassetteName != "undefined") {
          options.cassetteName = response.cassetteName;
        }
        Tapedeck.Backend.CassetteManager.Cassettify.nameCassette(response.rendered, options);
      }
    },

    nameCassette: function(code, options) {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var cMgr = Tapedeck.Backend.CassetteManager;
      cMgr.log("Cassette prepared, naming now")

      var nameAndSaveCassette = function(params) {
        if (typeof(params.submitButton) != "undefined" && params.submitButton != "submit") {
          if (params.submitButton == "anotherSite") {
            cMgr.Cassettify.byURL();
            return;
          }
          else if (params.submitButton == "advanced") {
            cMgr.Cassettify.byPattern();
            return;
          }
        }
        if (params.cassetteName.length == 0) {
          options.msg = "You must enter a name";
          cMgr.Cassettify.nameCassette(code, options);
          return;
        }

        // any non-a-Z,0-9, or space
        if ((/[^a-zA-Z0-9\s]/).test(params.cassetteName)) {
          options.msg = "Only a-Z, 0-9, and spaces are allowed.";
          cMgr.Cassettify.nameCassette(code, options);
          return;
        }
        var saveableName = params.cassetteName.replace(/\s/g, "_");

        if (typeof(Tapedeck.Backend.Cassettes[saveableName]) != "undefined") {
          options.msg = "The name you enterred is in use";
          cMgr.Cassettify.nameCassette(code, options);
          return;
        }

        cMgr.log("Saving cassette with name '" + saveableName + "'");

        code = code.replace(/CassetteFromTemplate/g,
                            saveableName);
        code = code.replace(/Unnamed/g, saveableName);
        Tapedeck.Backend.Bank.FileSystem.saveCassette(code,
                                                      saveableName,
                                                      cMgr.Cassettify.finish);
      };

      if (typeof(options.cassetteName) != "undefined"){
        nameAndSaveCassette(options);
      }
      else {
        var modalFields = [];
        if (typeof(options.msg) != "undefined") {
          modalFields.push({ type : "info",
                             text : options.msg });
        }
        modalFields.push({ type          : "info",
                           text          : "Name your new cassette",});
        if (typeof(options.domain) != "undefined") {
          options.domain = options.domain.replace("http://", "");
          options.domain = options.domain.replace("www.", "");

          modalFields.push({ type: "info",
                             text: "for " + options.domain })
        }
        modalFields.push({ type          : "input",
                           text          : "",
                           callbackParam : "cassetteName"  });

        msgHandler.showModal({
          fields: modalFields,
          submitButtons : [{ text: "Submit",
                             callbackParam: "submit" },
                           { text: "Try another site",
                             callbackParam: "anotherSite" },
                           { text: "Advanced",
                             callbackParam: "advanced" }],
          title: "Name New Cassette",
        }, nameAndSaveCassette);

      }
    },

    fail: function(params) {
      var msgHandler = Tapedeck.Backend.MessageHandler;
      var cMgr = Tapedeck.Backend.CassetteManager;
      self = cMgr.Cassettify;

      var fields = [];
      if ((params.msg) != "undefined") {
        fields.push({ type : "info",
                      text : params.msg });
      }
      fields.push({ type  : "info", text : "Please try again." })

      msgHandler.showModal({
        fields: fields,
        submitButtons : [{ text: "Try another site",
                           callbackParam: "anotherSite" },
                         { text: "Advanced",
                           callbackParam: "advanced" }],
        title: "Cassettify Failed",
      }, self.chooseMethod, self.postLoadCleanup);
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

    chooseMethod: function(params) {
      var cMgr = Tapedeck.Backend.CassetteManager;
      var self = cMgr.Cassettify;
      if (typeof(params.submitButton) != "undefined" && params.submitButton != "submit") {
        if (params.submitButton == "anotherSite") {
          cMgr.Cassettify.byURL();
          return;
        }
        else if (params.submitButton == "advanced") {
          cMgr.Cassettify.byPattern();
          return;
        }
      }
    },

    quickCreate: function() {
      var cMgr = Tapedeck.Backend.CassetteManager;
      var name = "TBE " + Math.floor(Math.random() * 100000);
      cMgr.Cassettify.handlePatternInput({ pattern : "theburningear.com/page/$#",
                                           cassetteName : name });
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

  log: function(str, level) {
    var self = Tapedeck.Backend.CassetteManager;
    if (self.debug == self.DEBUG_LEVELS.NONE) {
      return;
    }
    if (typeof(level) == "undefined") {
      level = self.DEBUG_LEVELS.BASIC;
    }
    if (self.debug >= level) {
      var currentTime = new Date();
      console.log("CMgr (" + currentTime.getTime() + ") : " + str);
    }
  }
};
