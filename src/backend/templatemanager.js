Tapedeck.Backend.TemplateManager = {

  packages: {},
  currentPackage: "default",
  cssForPackages: { },
  requiredScripts: [
    "Frame",
    "Player",
    "PlaylistList",
    "TrackList",
    "Queue",
    "BrowseRegion",
    "BrowseList",
    "CassetteList"
  ],

  init: function() {
    var tMgr = Tapedeck.Backend.TemplateManager;

    // will receive [{ name: "", contents: "", url: "", cssURL: "", cssContents: "" }]
    Tapedeck.Backend.Bank.FileSystem.getTemplates(function(templateDatas) {

      // if there are no templates in the filesystem, read in the default
      if (templateDatas.length == 0) {

        // div needed to preserve script tags of template
        var div = $('div');
        $("script[type='text/template']").each(function(index, script) {
          $(div).append(script);
        })
        var templateCode = $(div).remove().html();

        // read in tapedeck.css through XHR
        var url = chrome.extension.getURL("frontend/tapedeck.css");
        $.ajax({
          type: "GET",
          url: url,
          dataType: "text",
          success : function(cssCode) {
            tMgr.addTemplate(templateCode, cssCode, "default", function() { })
          },
          error : function(xhr, status) {
            console.error("Error getting tapedeck.css: " + status);
          }
        });
      }
      else {
        // templates found, set them up
        tMgr.loadTemplates(templateDatas);
      }
    });
  },

  addTemplate: function(templateCode, cssCode, packageName, callback) {

    // save the new template
    Tapedeck.Backend.Bank.FileSystem.saveTemplate(templateCode,
                                                  cssCode,
                                                  packageName,
                                                  function() {

      // get all saved templates and load them
      Tapedeck.Backend.Bank.FileSystem.getTemplates(function(templateDatas){
        Tapedeck.Backend.TemplateManager.loadTemplates(templateDatas);
        callback();
      });
    });
  },

  loadTemplates: function(templates) {
    var tMgr = Tapedeck.Backend.TemplateManager;

    for (var i = 0; i < templates.length; i++) {
      var template = templates[i];
      tMgr.packages[template.name] = true;

      // save the template to the background page except for those that are
      // already there
      if ($("script#Frame-" + template.name + "-template").length == 0) {
        var scripts = Tapedeck.Backend.Utils.removeTags(template.contents,
                                                       ["html", "head", "body"],
                                                       false);
        $("head").first().append(scripts);
      }

      // save the cssURLs so the frame can retrieve them
      tMgr.cssForPackages[template.name] = template.cssURL;
    }
  },

  setPackage: function(packageName) {
    if (packageName in this.packages) {
      this.currentPackage = packageName;
    }
    else {
      this.currentPackage = "default";
    }
  },

  // packageName is optional
  // if postPopulate then view will be rendered and pushed without options and a
  // following push with options will be made when ready
  renderView: function(scriptName, packageName, callback, postPopulate) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (typeof(packageName) == "function") {
      postPopulate = callback;
      callback = packageName;
      packageName = null;
    }
    if (typeof(postPopulate) == "undefined") {
      postPopulate = false;
    }

    // generate the view with no options to know what it needs
    var viewScript = tMgr.getViewScript(scriptName);
    var hollowView = new viewScript({ });

    if (postPopulate) {
      tMgr.renderViewWithOptions(scriptName, packageName, { }, callback);
    }
    tMgr.fillOptions(hollowView.getOptions(), function(filledOptions) {
      tMgr.renderViewWithOptions(scriptName, packageName, filledOptions, callback);
    });
  },

  renderViewWithOptions: function(scriptName, packageName, options, callback) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (packageName && typeof(packageName) != "string") {
      callback = options;
      options = packageName;
      packageName = null;
    }
    var viewScript = tMgr.getViewScript(scriptName);
    var view = new viewScript(options);

    var el = view.render();
    tMgr.assignImages(el, view.getImages());

    callback({ el : el, proxyEvents : view.getEvents() });
  },

  assignImages: function(el, images) {
    for (var selector in images) {
      $(el).find(selector).each(function(index, elem) {
        var url = chrome.extension.getURL("images/" + images[selector]);
        if ($(elem).get(0).tagName == "DIV") {
          url = "url('" + url + "')";
          $(elem).css("background-image", url);
        }
        else if ($(elem).get(0).tagName == "IMG") {
          $(elem).attr("src", url);
        }
      });
    }
  },

  fillOptions: function(requestedOptions, callback) {
    var tMgr = Tapedeck.Backend.TemplateManager;
    var fillMap = {
      "currentCassette" : tMgr.getCurrentCassette,
      "currentPage" : tMgr.getCurrentPage,
      "cassetteList" : tMgr.getCassettes,
      "browseList" : tMgr.getBrowseList,
      "queue" : tMgr.getQueue,
      "playlistList" : tMgr.getPlaylistList,
      "playerState" : tMgr.getPlayerState,
      "currentTrack" : tMgr.getCurrentTrack,
      "tabID" : tMgr.getTabID,
    };

    var options = {};
    var optionCount = 0;
    var filledCount = 0;
    for (var optionName in requestedOptions) {
      if (optionName in fillMap) {

        // attempt to the fill the requested option
        optionCount = optionCount + 1;
        var paramName = requestedOptions[optionName];
        var fillFn = fillMap[optionName];

        var scoped = function(param, filler) {

          // call the filler
          filler(function(filling) {
            options[param] = filling;
            filledCount = filledCount + 1;
            if (filledCount >= optionCount) {
              callback(options);
            }
          }, function(error) {
            // failed to fill
            optionCount = optionCount - 1;
            options[param] = "error";
            console.error("Fill map error on param '" + param + "': "+ error.message);
            if (filledCount >= optionCount) {
              callback(options);
            }
          });

        }(paramName, fillFn); // end scoped

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
    callback(Tapedeck.Backend.CassetteManager.currPage)
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

    var handleTrackJSONs = function(trackJSONs) {

      // Only push the browselist if we are still browsing the
      // cassette that these tracks belong to
      if (typeof(cMgr.currentCassette) == "undefined" ||
          cMgr.currentCassette == null ||
          typeof(trackJSONs) == "undefined" ||
          (trackJSONs.length > 0 &&
           trackJSONs[0].cassette != cMgr.currentCassette.get("name"))) {
        callback(null);
        return;
      }
      var browseTrackList = new Tapedeck.Backend.Collections.TrackList(trackJSONs);

      Tapedeck.Backend.Bank.saveBrowseList(browseTrackList);

      callback(browseTrackList);
    };

    try {
      if (cMgr.currentCassette.isPageable()) {
        cMgr.currentCassette.getPage(cMgr.currPage,
                                     context,
                                     handleTrackJSONs,
                                     errCallback);
      }
      else {
        cMgr.currentCassette.getBrowseList(context, handleTrackJSONs, errCallback);
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

  getViewScript: function(scriptName) {
    return Tapedeck.Backend.Views[scriptName];
  },

  getTemplate: function(templateName, packageName) {
    if (!this.isValidPackage(packageName)) {
      packageName = this.currentPackage;
    }

    // first get the contents of the template
    var templateSelector = "script#" + templateName + "-" + packageName + "-template";
    var html = $(templateSelector).html();

    /* Now populate it with all reference templates as if they were present.
     * We accomodate selfclosed template ref tags and immediately closed ones
     * (somewhere they are getting converted from self closed to immediately). */
    var selfClosedTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*(><\/" + tag + ">|\/>)", "gi");
    }

    var templateMatch = null;
    templateTagRegex = selfClosedTagRegex("template");
    while ((templateMatch = templateTagRegex.exec(html)) != null) {

      // first get information about the referenced template
      var templateTag = templateMatch[0];
      var subtemplateMatch = templateTag.match(/ref\s*?=\s*?['"]([^'"-]*)-([^'"-]*)-template['"]/);

      var subtemplateName = subtemplateMatch[1];
      var subtemplatePackage = subtemplateMatch[2];

      // got the template, we still need to fold the <tapedeck> portion in
      var subtemplateHTML = this.getTemplate(subtemplateName, subtemplatePackage);

      // extract the <tapedeck> portion
      var openTagRegex = function(tag) {
        return new RegExp("<\s*" + tag + "[^<>]*>", "gi");
      }
      var closeTagRegex = function(tag) {
        return new RegExp("<\/" + tag + "[^<>]*>", "gi");
      }
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
        var remapRegex = /([^,:]*):([^,]*)/g
        while ((remapMatch = remapRegex.exec(remappingString)) != null) {
          var original = remapMatch[1];
          var remapping = remapMatch[2];
          html = html.replace(new RegExp(original, "g"), remapping);
         }
      }
    }

    return html;
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
}
