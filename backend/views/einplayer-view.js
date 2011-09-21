Einplayer.Backend.Views.Player = Backbone.View.extend({

  tagName: "div",
  className: "player",
  requiredTemplates: [
    "Player",
  ],
  template: null,

  initialize: function() {
    this.tabID = this.options.tabID;
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("Player"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ });

    var queueTracks = Einplayer.Backend.Sequencer.queue;
    var queueView = Einplayer.Backend
                             .TemplateManager
                             .renderView("TrackList",
                                         { trackList: queueTracks,
                                           rowDblClick : "queueDblClick" });
                                         
    var queueListID = "queue-list";
    queueView.id = queueListID;
    $(this.el).find("#" + queueListID).replaceWith(queueView);

    var cassetteMgr = Einplayer.Backend.CassetteManager;

    var loadCassettesAndBrowse = function(context) {
      if (cassetteMgr.currentCassette) {
        cassetteMgr.currentCassette.getBrowseList(context, function(trackJSONs) {
          console.log("dump::::" + JSON.stringify(trackJSONs));
          var browseTrackList = new Einplayer.Backend.Collections.TrackList
                                                     (trackJSONs);

          Einplayer.Backend.Bank.saveTracks(browseTrackList);

          var browseView = Einplayer.Backend
                                    .TemplateManager
                                    .renderView("TrackList",
                                                { trackList   : browseTrackList,
                                                  rowDblClick : "browseDblClick" });

          var browseListID = "browse-list";
          browseView.id = browseListID;
          Einplayer.Backend.MessageHandler.pushView(browseListID,
                                                    browseView);
        });
      }
      else {
        // TODO show CassetteList in front
      }
    }
    
    chrome.tabs.get(this.tabID, function(tab) {
      Einplayer.Backend.Utils.getContext(loadCassettesAndBrowse, tab);
    });
    return this.el;
  },

});
