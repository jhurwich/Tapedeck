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
    this.renderPlaylistList();
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

  renderPlaylistList: function() {
    var playlistList = Einplayer.Backend.Bank.getPlaylists();
    var playlistListView = Einplayer.Backend
                                    .TemplateManager
                                    .renderView("PlaylistList",
                                                { playlistList   : playlistList });
                                                 
    $(this.el).find("#playlist-list").replaceWith(playlistListView);
  },
  
  renderCassetteBrowser: function() {

  },
  
  renderBrowseList: function() {
    chrome.tabs.get(this.tabID, function(tab) {
      var currCassette = Einplayer.Backend.CassetteManager.currentCassette;
      var context = Einplayer.Backend.Utils.getContext(tab);
      
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
    });
  },
});
