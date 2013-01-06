Tapedeck.Backend.TemplateManager = {

  packages: {},
  currentPackage: "default",
  cssForPackages: { },
  requiredScripts: [
    "Frame",
    "Player",
    "PlaylistList",
    "Queue",
    "BrowseRegion",
    "BrowseList",
    "CassetteList"
  ],

  init: function(continueInit) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    tMgr.log("TemplateManager.init() starting", Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

    // will receive [{ name: "", contents: "", url: "", cssURL: "" }]
    Tapedeck.Backend.Bank.FileSystem.getTemplates(function(templateDatas) {

      // templates found, set them up
      tMgr.log(templateDatas.length + " templates received from filesystem", Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);
      tMgr.loadTemplates(templateDatas);
      continueInit();

    });
  },

  addTemplate: function(templateCode, cssCode, packageName, callback) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    tMgr.log("Adding new template for package '" + packageName + "'");

    Tapedeck.Backend.Bank.FileSystem.saveTemplate(templateCode,
                                                  cssCode,
                                                  packageName,
                                                  function() {

      // get all saved templates and load them
      Tapedeck.Backend.Bank.FileSystem.getTemplates(function(templateDatas) {
        tMgr.loadTemplates(templateDatas);
        callback();
      });
    });
  },

  loadTemplates: function(templates) {
    var tMgr = Tapedeck.Backend.TemplateManager;

    for (var i = 0; i < templates.length; i++) {
      var template = templates[i];
      tMgr.packages[template.name] = true;

      // save the template to the background page except for those that are already there
      if ($("script#Frame-" + template.name + "-template").length === 0) {
        tMgr.log("Loading new template '" + template.name + "' into background DOM");
        var scripts = Tapedeck.Backend.Utils.removeTags(template.contents,
                                                       ["html", "head", "body"],
                                                       false);
        $("head").first().append(scripts);
      }

      // save the cssURLs so the frame can retrieve them
      if (typeof(tMgr.cssForPackages[template.name]) != "string") {
        tMgr.cssForPackages[template.name] = template.cssURL;
      }
    }
  },

  // returns an array of the package names that are available
  getPackages: function() {
    var tMgr = Tapedeck.Backend.TemplateManager;
    return Object.keys(tMgr.packages);
  },

  setPackage: function(packageName) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    tMgr.log("Setting to package '" + packageName + "'", Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

    if (packageName in this.packages) {
      this.currentPackage = packageName;
    }
    else {
      tMgr.log("Package not found, setting to default");
      this.currentPackage = "default";
    }
  },

  // packageName, callback, pushHollowFirst, and tab are optional
  // returns the viewData, el and proxyEvents, but also pushes it
  renderViewAndPush: function(scriptName, packageName, callback, pushHollowFirst, tab) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (typeof(packageName) != "string") {
      tab = pushHollowFirst;
      pushHollowFirst = callback;
      callback = packageName;
      packageName = null;
    }
    if (typeof(callback) != "function") {
      tab = pushHollowFirst;
      pushHollowFirst = callback;
      callback = undefined;
    }
    if (typeof(pushHollowFirst) != "boolean") {
      tab = pushHollowFirst;
      pushHollowFirst = false;
    }

    var fullRenderComplete = false;
    if (pushHollowFirst) {
      tMgr.renderViewWithOptions(scriptName, packageName, { }, function(hollowViewData) {
        // hollow view rendered, push here but prevent if main push succeeded
        if (!fullRenderComplete) {
          Tapedeck.Backend.MessageHandler.pushView(hollowViewData.el,
                                                   hollowViewData.proxyEvents,
                                                   hollowViewData.proxyImages,
                                                   tab);
        }
      });
    }

    tMgr.renderView(scriptName, packageName, function(fullViewData) {
      fullRenderComplete = true;

      // push to the selectedTab, or specified tab if one was given
      if (typeof(tab) == "undefined" || !tab) {
        Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
          Tapedeck.Backend.MessageHandler.pushView(fullViewData.el,
                                                   fullViewData.proxyEvents,
                                                   fullViewData.proxyImages,
                                                   selectedTab);
        });
      }
      else {
        Tapedeck.Backend.MessageHandler.pushView(fullViewData.el,
                                                 fullViewData.proxyEvents,
                                                 fullViewData.proxyImages,
                                                 tab);
      }

      if (typeof(callback) != "undefined") {
        callback(fullViewData);
      }
    });
  },

  // packageName is optional
  renderView: function(scriptName, packageName, callback) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (typeof(packageName) == "function") {
      callback = packageName;
      packageName = null;
    }

    // generate the view with no options to know what it needs
    var viewScript = tMgr.getViewScript(scriptName);
    var hollowView = new viewScript({ });

    var repeatCount = 0;
    var completeRender = function() {
      if (!hollowView.initComplete) {
        if (repeatCount < 10) {
          repeatCount++;
          setTimeout(completeRender, 50);
        }
        else {
          console.error("ViewScript never initialized");
        }
        return;
      }

      tMgr.fillOptions(hollowView.getOptions(), function(filledOptions) {
        tMgr.renderViewWithOptions(scriptName, packageName, filledOptions, callback);
      });
    };
    completeRender();
  },

  renderViewWithOptions: function(scriptName, packageName, options, callback) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (packageName && typeof(packageName) != "string") {
      callback = options;
      options = packageName;
      packageName = null;
    }
    tMgr.log("Rendering view '" + scriptName + "' from package '" + packageName + "'");
    tMgr.log("with options: \n" + JSON.stringify(options), Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

    var viewScript = tMgr.getViewScript(scriptName);
    var view = new viewScript(options);

    view.render(function(el) {
      var proxyEvents = view.getEvents();
      var proxyImages = view.getImages();
      el = tMgr.removeTemplateCruft(el);

      callback({ el : el,
                 proxyEvents : proxyEvents,
                 proxyImages : proxyImages });
    });
  },

  assignImages: function(el, images) {
    var assign = function(index, elem) {
      var url = chrome.extension.getURL("images/" + images[selector]);
      if ($(elem).get(0).tagName == "DIV") {
        url = "url('" + url + "')";
        $(elem).css("background-image", url);
      }
      else if ($(elem).get(0).tagName == "IMG") {
        $(elem).attr("src", url);
      }
    };

    for (var selector in images) {
      $(el).find(selector).each(assign);
    }
  },

  removeTemplateCruft: function(el) {
    // first remove the <tapedeck> metadata
    $(el).find("tapedeck").remove();

    // then remove the <template> tags
    var templateTags = $(el).find("template");
    templateTags.each(function(index, elem) {
      $(elem, el).replaceWith($(elem, el).html());
    });

    return el;
  },

  /* Fill each of the requestedOptions, fillings can be objects with object.fillAll = true
   * to fold multiple values into the options to callback.  Otherwise, all params of options will
   * be keys in the fillMap
   */
  fillOptions: function(requestedOptions, callback) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    var fillMap = {
      "currentCassette" : tMgr.getCurrentCassette,
      "currentPage" : tMgr.getCurrentPage,
      "currentFeed" : tMgr.getCurrentFeed,
      "cassetteList" : tMgr.getCassettes,
      "browseList" : tMgr.getBrowseList,
      "queue" : tMgr.getQueue,
      "playlistList" : tMgr.getPlaylistList,
      "playerState" : tMgr.getPlayerState,
      "currentTrack" : tMgr.getCurrentTrack,
      "tabID" : tMgr.getTabID,
      "options": tMgr.getOptions
    };
    tMgr.log("Filling options: " + JSON.stringify(requestedOptions), Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

    var options = {};
    var optionCount = Object.keys(requestedOptions).length;
    var filledCount = 0;

    var scoped = function(param, filler) {
      // call the filler
      filler(function(filling) {
        // if filling.fillAll, then fold all params from filling into options
        if (filling &&
            typeof(filling) == "object" &&
            typeof(filling.fillAll) != "undefined" &&
            filling.fillAll) {
          for (var aParam in filling) {
            if (aParam != "fillAll") {
              options[aParam] = filling[aParam];
            }
          }
        }
        else {
          options[param] = filling;
        }

        filledCount = filledCount + 1;
        if (filledCount >= optionCount) {
          callback(options);
        }
      }, function(error) {
        // failed to fill
        optionCount = optionCount - 1;
        options[param] = "error";
        console.error("Fill map error on param '" + param + "': "+ JSON.stringify(error));
        if (filledCount >= optionCount) {
          callback(options);
        }
      });
    }; // end scoped

    for (var optionName in requestedOptions) {
      if (optionName in fillMap) {
        // attempt to the fill the requested option
        var paramName = requestedOptions[optionName];
        var fillFn = fillMap[optionName];
        scoped(paramName, fillFn);
      }
      else {
        console.error(optionName + " not in the fillMap");
      }
    }
  },


  getCurrentCassette: function(callback) {
    callback(Tapedeck.Backend.CassetteManager.currentCassette);
  },
  getCurrentPage: function(callback) {
    callback(Tapedeck.Backend.CassetteManager.currPage);
  },
  getCurrentFeed: function(callback) {
    var feed = Tapedeck.Backend.CassetteManager.currFeed;
    if (typeof(feed) == "undefined" || !feed) {
      feed = undefined;
    }
    callback(feed);
  },
  getCassettes: function(callback) {
    callback(Tapedeck.Backend.CassetteManager.getCassettes());
  },
  getBrowseList: function(callback, errCallback, tab) {
    if (typeof(tab) == "undefined") {
      Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
        Tapedeck.Backend.TemplateManager.getBrowseList(callback, errCallback, selectedTab);
      });
      return;
    }
    var cMgr = Tapedeck.Backend.CassetteManager;

    // no current cassette, no browse list
    if (cMgr.currentCassette == "undefined" || !cMgr.currentCassette) {
      callback(null);
      return;
    }

    var context = Tapedeck.Backend.Utils.getContext(tab);

    var handleResponse = function(response) {

      // Only push the browselist if we are still browsing the
      // cassette that these tracks belong to
      if (typeof(cMgr.currentCassette) == "undefined" ||
          cMgr.currentCassette == null ||
          typeof(response.tracks) == "undefined" ||
          (response.tracks.length > 0 &&
           response.tracks[0].cassette != cMgr.currentCassette.get("name"))) {
        callback(null);
        return;
      }
      var browseTrackList = new Tapedeck.Backend.Collections.TrackList(response.tracks);
      Tapedeck.Backend.Bank.saveCurrentBrowseList(browseTrackList);

      var toReturn = { fillAll: true,
                       browseList: browseTrackList,
                       stillParsing: response.stillParsing };

      callback(toReturn);
    };

    var finalCallback = function(response) {
      var msgHandler = Tapedeck.Backend.MessageHandler;


      var continueFinal = function(aResponse) {

        if (!msgHandler.addTrackAvailable) {
          // We shifted the new tracks to the queue, and push empty array
          setTimeout(continueFinal, 200, aResponse);
          return;
        }

        Tapedeck.Backend.Bank.getCurrentBrowseList(function(browseList){
          if (typeof(aResponse.success) == "undefined") {
            console.error("Got no success");
            aResponse.success = true;
          }

          if (!aResponse.success || aResponse.errorCount > 0) {
            // some error occurred
            var errorString = "";
            if (browseList.length === 0) {
              errorString = "Sorry, we could not parse the site.";
              if (aResponse.errorCount > 1) {
                errorString += " (" + aResponse.errorCount + " errors)";
              }
            }
            else if (aResponse.errorCount > 1) {
              errorString = "There were " + aResponse.errorCount + " errors when parsing the site.";
            }
            else {
              errorString = "There were errors when parsing the site.";
            }
            Tapedeck.Backend.MessageHandler.pushBrowseTrackList(browseList, errorString, tab);
          }
          else {
            // success path
            Tapedeck.Backend.MessageHandler.pushBrowseTrackList(browseList, tab);
          }
        }); // end getCurrentBrowseList()
      }; // end continueFinal()

      if (typeof(response.tracks) != "undefined" && response.tracks.length > 0) {
        msgHandler.addTracks(response.tracks, continueFinal.curry(response));
      }
      else {
        continueFinal(response);
      }
    }; // end finalCallback()

    try {
      if (cMgr.currentCassette.isPageable()) {
        cMgr.currentCassette.getPage(cMgr.currPage,
                                     context,
                                     handleResponse,
                                     errCallback,
                                     finalCallback);
      }
      else {
        cMgr.currentCassette.getBrowseList(context, handleResponse, errCallback, finalCallback);
      }
    }
    catch (e) {
      console.error("GOT ERROR IN BROWSE LIST: " + e.message);
    }
  },
  getQueue: function(callback) {
    callback(Tapedeck.Backend.Sequencer.queue);
  },
  getPlaylistList: function(callback) {
    callback(Tapedeck.Backend.Bank.getPlaylists());
  },
  getPlayerState: function(callback) {
    callback(Tapedeck.Backend.Sequencer.getCurrentState());
  },
  getCurrentTrack: function(callback) {
    callback(Tapedeck.Backend.Sequencer.getCurrentTrack());
  },
  getTabID: function(callback) {
    Tapedeck.Backend.MessageHandler.getSelectedTab(function(selectedTab) {
      callback(selectedTab.id);
    });
  },
  getOptions: function(callback) {
    Tapedeck.Backend.OptionsManager.getOptions(callback);
  },

  getViewScript: function(scriptName) {
    return Tapedeck.Backend.Views[scriptName];
  },

  exceptionTemplates: { "Options" :  "frontend/options/options-template.html" },
  templatesInProgress: {},
  // packageName is optional
  getTemplate: function(templateName, packageName, callback) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (arguments.length == 2) {
      callback = packageName;
      packageName = this.currentPackage;
    }

    if (!this.isValidPackage(packageName)) {
      packageName = this.currentPackage;
    }
    tMgr.log("Requesting template '" + templateName + "' for package '" + packageName + "'");

    // Some templates can't be changed and live outside of background.html.  Grab those with this.
    if (templateName in tMgr.exceptionTemplates) {
      Tapedeck.Backend.Utils.getFileContents(tMgr.exceptionTemplates[templateName],
                                             callback);
      return;
    }

    // first get the contents of the template
    var templateSelector = "script#" + templateName + "-" + packageName + "-template";
    var html = $(templateSelector).html();
    tMgr.log("found in DOM template '" + templateName + "' : " + html, Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

    /* Now populate it with all reference templates as if they were present.
     * We accomodate selfclosed template ref tags and immediately closed ones
     * (somewhere they are getting converted from self closed to immediately). */
    var selfClosedTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*(><\/" + tag + ">|\/>)", "gi");
    };

    var populateSubTemplate = function(subtemplateHTML) {
      // extract the <tapedeck> portion
      var openTagRegex = function(tag) {
        return new RegExp("<\s*" + tag + "[^<>]*>", "gi");
      };
      var closeTagRegex = function(tag) {
        return new RegExp("<\/" + tag + "[^<>]*>", "gi");
      };
      var openRegex = openTagRegex('tapedeck');
      var openMatch = null;
      var closeRegex = closeTagRegex('tapedeck');
      var closeMatch = null;
      while ((openMatch = openRegex.exec(subtemplateHTML)) != null) {
        if ((closeMatch = closeRegex.exec(subtemplateHTML)) != null &&
            openMatch.index < closeMatch.index ) {

          // <tapedeck> extracted here and folded into the outer template's
          var tapedeck = subtemplateHTML.substring
                                        (openMatch.index + openMatch[0].length,
                                         closeMatch.index);

          html = html.replace(closeRegex, tapedeck + " </tapedeck>");

          subtemplateHTML = subtemplateHTML.replace
                                           (subtemplateHTML.substring
                                                           (openMatch.index,
                                                            closeMatch.index + closeMatch[0].length), "");
        }
      }

      // strip out the <template> and </template> of the subtemplate
      subtemplateHTML = subtemplateHTML.replace(openTagRegex('template'), "");
      subtemplateHTML = subtemplateHTML.replace(closeTagRegex('template'), "");

      // add in the subtemplate
      html = html.replace(templateTag, subtemplateHTML);

      // now handle any remappings
      var remapMatch = templateTag.match(/remap\s*?=\s*?['"]([^'"]*)['"]/);
      if (remapMatch != null) {
        var remappingString = remapMatch[1];
        var remapRegex = /([^,:]*):([^,]*)/g;
        while ((remapMatch = remapRegex.exec(remappingString)) != null) {
          var original = remapMatch[1];
          var remapping = remapMatch[2];
          html = html.replace(new RegExp(original, "g"), remapping);
         }
      }
      tMgr.templatesInProgress[templateName].subtemplatesComplete++;

      if (templateMatch == null &&
          tMgr.templatesInProgress[templateName].subtemplatesComplete >= tMgr.templatesInProgress[templateName].numSubtemplates) {
        delete tMgr.templatesInProgress[templateName];
        callback(html);
      }
    }; // end populateSubTemplate

    tMgr.templatesInProgress[templateName] = { numSubtemplates: 0, subtemplatesComplete: 0 };
    var templateTagRegex = selfClosedTagRegex("template");
    var templateMatch = templateTagRegex.exec(html);
    while (templateMatch != null) {
      var templateTag = templateMatch[0];
      templateMatch = templateTagRegex.exec(html);

      tMgr.templatesInProgress[templateName].numSubtemplates++;

      // first get information about the referenced template
      var subtemplateMatch = templateTag.match(/ref\s*?=\s*?['"]([^'"\-]*)-([^'"\-]*)-template['"]/);
      var subtemplateName = subtemplateMatch[1];
      var subtemplatePackage = subtemplateMatch[2];
      tMgr.log("Subtemplate of '" + templateName + "' found, populating '" + subtemplateName + "'", Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

      // got the template, we still need to fold the <tapedeck> portion in
     this.getTemplate(subtemplateName, subtemplatePackage, populateSubTemplate); // end getTemplate for subtemplate
    }
    if (typeof(tMgr.templatesInProgress[templateName]) != "undefined" &&
        tMgr.templatesInProgress[templateName].subtemplatesComplete >= tMgr.templatesInProgress[templateName].numSubtemplates) {
      delete tMgr.templatesInProgress[templateName];
      callback(html);
    }
  },

  getCSSURL: function(packageName) {
    if (!this.isValidPackage(packageName)) {
      packageName = this.currentPackage;
    }

    return Tapedeck.Backend.TemplateManager.cssForPackages[packageName];
  },

  isValidPackage: function(packageName) {
    if (typeof packageName == "undefined" ||
        !packageName ||
        packageName.length <= 0) {
      return false;
    }
    return (packageName in this.packages) ;
  },

  log: function(str, level) {
    Tapedeck.Backend.Utils.log("TemplateManager", str, level);
  }
};
