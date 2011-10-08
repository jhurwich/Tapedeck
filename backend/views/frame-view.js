Einplayer.Backend.Views.Frame = Backbone.View.extend({

  tagName: "div",
  id: "einplayer-content",
  requiredTemplates: [
    "Frame",
  ],
  template: null,

  initialize: function() {
    this.tabID = this.options.tabID;
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("Frame"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ });

    this.renderPlayer();
    this.renderQueue();
    this.renderCassetteBrowser();
    this.renderBrowseList();

    var cassetteMgr = Einplayer.Backend.CassetteManager;

    if (cassetteMgr.currentCassette) {

    }
    else {
      // TODO show CassetteList in front
    }
    return this.el
  },

  renderPlayer: function() {
    var playerView = Einplayer.Backend
                              .TemplateManager
                              .renderView("Player", { });
    var playerID = "player";
    playerView.id = playerID;
    
    $(this.el).find("#" + playerID).replaceWith(playerView);
  },

  renderQueue: function() {
    var queueTracks = Einplayer.Backend.Sequencer.queue;
    var queueView = Einplayer.Backend
                             .TemplateManager
                             .renderView("Queue",
                                         { trackList   : queueTracks });
    
    $(this.el).find("#queue-list").replaceWith(queueView);
  },

  renderCassetteBrowser: function() {

  },
  
  renderBrowseList: function() {
    var loadBrowseList = function(context) {
      var currCassette = Einplayer.Backend.CassetteManager.currentCassette;
      currCassette.getBrowseList(context, function(trackJSONs) {
        var browseTrackList = new Einplayer.Backend.Collections.TrackList
                                                   (trackJSONs);
  
        Einplayer.Backend.Bank.saveTracks(browseTrackList);
  
        var browseView = Einplayer.Backend
                                  .TemplateManager
                                  .renderView("BrowseList",
                                              { trackList   : browseTrackList });

        Einplayer.Backend.MessageHandler.pushView("browse-list",
                                                  browseView);
      });
    };
    
    chrome.tabs.get(this.tabID, function(tab) {
      Einplayer.Backend.Utils.getContext(loadBrowseList, tab);
    });;
  },
});
