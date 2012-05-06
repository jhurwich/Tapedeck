Tapedeck.Backend.Views.BrowseRegion = Backbone.View.extend({

  tagName: "div",
  className: "region",
  id: "browse-region",
  requiredTemplates: [
    "BrowseRegion",
    "BrowseList",
    "CassetteList"
  ],
  template: null,

  proxyEvents: { },
  eventsName: "browseRegionEvents",

  initialize: function() {
    // In theory the browseRegion is a convenience construct to keep the
    // browseRegion updated with current data without the need to gather
    // all that data.
    // Therefore, param options besides tabID should not be specified,
    // this view should collect its own information.
    this.tabID = this.options.tabID;

    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate("BrowseRegion"));
  },

  render: function() {
    var el = this.el;
    el.innerHTML =  this.template({ });

    // First render the cassettelist.  We may need to hide it.
    var cMgr = Tapedeck.Backend.CassetteManager;
    var cassetteListView = Tapedeck.Backend.TemplateManager.renderView
      ("CassetteList", { cassetteList : cMgr.getCassettes() });

    $(el).find("#cassette-list").replaceWith(cassetteListView.el);
    this.proxyEvents = _.extend(this.proxyEvents,
                                cassetteListView.proxyEvents);

    // We'll need  to return before the browse-list can load, so hide it
    // for now.  If there is a currentCassette, we'll start loading the
    // browselist and it will update the view when it is ready.
    $(el).find("#browse-list").hide();
    if (cMgr.currentCassette != null) {
      var browseView = Tapedeck.Backend
                               .TemplateManager
                               .renderView("BrowseList",
                                           { currentCassette : cMgr.currentCassette,
                                             currentPage     : cMgr.currPage });
      $(el).find("#browse-list").replaceWith(browseView.el);
      $(el).find("#cassette-list").hide();
      this.proxyEvents = _.extend(this.proxyEvents,
                                  browseView.proxyEvents);

      chrome.tabs.get(this.tabID, function(tab) {
        // There is a current cassette, render its browselist
        var context = Tapedeck.Backend.Utils.getContext(tab);

        var handleTrackJSONs = function(trackJSONs) {

          // Only push the browselist if we are still browsing the
          // cassette that these tracks belong to
          if (typeof(cMgr.currentCassette) == "undefined" ||
              cMgr.currentCassette == null ||
              typeof(trackJSONs) == "undefined" ||
              (trackJSONs.length > 0 &&
               trackJSONs[0].cassette != cMgr.currentCassette.get("name"))) {
            return;
          }
          var browseTrackList = new Tapedeck.Backend.Collections.TrackList
                                                    (trackJSONs);

          Tapedeck.Backend.Bank.saveBrowseList(browseTrackList);

          browseView = Tapedeck.Backend
                               .TemplateManager
                               .renderView("BrowseList",
                                           { trackList       : browseTrackList,
                                             currentCassette : cMgr.currentCassette,
                                             currentPage     : cMgr.currPage });
          $(el).find("#browse-list").replaceWith(browseView.el);

          Tapedeck.Backend.MessageHandler.pushView("browse-region",
                                                   el,
                                                   browseView.proxyEvents,
                                                   tab);
        };

        if (cMgr.currentCassette.isPageable()) {
          cMgr.currentCassette.getPage(cMgr.currPage,
                                       context,
                                       handleTrackJSONs);
        }
        else {
          cMgr.currentCassette.getBrowseList(context, handleTrackJSONs);
        }
      });
    }

    Tapedeck.Backend.Utils.proxyEvents(this, this.eventsName);
    return el;
  },

});
