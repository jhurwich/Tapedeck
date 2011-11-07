Tapedeck.Backend.Views.Frame = Backbone.View.extend({

  tagName: "div",
  id: "tapedeck-content",
  requiredTemplates: [
    "Frame",
  ],
  template: null,

  initialize: function() {
    this.tabID = this.options.tabID;
    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate("Frame"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ });

    this.renderPlayer();
    this.renderQueue();
    this.renderPlaylistList();
    this.renderBrowseRegion();
    
    this.assignPlaybackButtonImgs();

    return this.el
  },

  renderPlayer: function() {
    var playerView = Tapedeck.Backend
                             .TemplateManager
                             .renderView("Player", { });
    var playerID = "player";
    playerView.id = playerID;
    
    $(this.el).find("#" + playerID).replaceWith(playerView);
  },

  renderQueue: function() {
    var queueTracks = Tapedeck.Backend.Sequencer.queue;
    var queueView = Tapedeck.Backend
                            .TemplateManager
                            .renderView("Queue",
                                        { trackList : queueTracks });
    
    $(this.el).find("#queue-list").replaceWith(queueView);
  },

  renderPlaylistList: function() {
    var playlistList = Tapedeck.Backend.Bank.getPlaylists();
    var playlistListView = Tapedeck.Backend
                                   .TemplateManager
                                   .renderView("PlaylistList",
                                               { playlistList : playlistList });
                                                 
    $(this.el).find("#playlist-list").replaceWith(playlistListView);
  },
  
  renderBrowseRegion: function() {
    var browseRegionView = Tapedeck.Backend
                                   .TemplateManager
                                   .renderView("BrowseRegion",
                                               { tabID : this.tabID });

    $(this.el).find("#browse-region").replaceWith(browseRegionView);
  },
  
  assignPlaybackButtonImgs: function() {
    this.assignImg("repeat", "repeat.png");
    this.assignImg("queue-shuffle", "shuffle.png");
    this.assignImg("queue-clear", "trash.png");
  },

  assignImg: function(elemID, image) {
    var elem = $(this.el).find("#" + elemID).first();
    var url = chrome.extension.getURL("images/" + image);
    if ($(elem).get(0).tagName == "DIV") {
      url = "url('" + url + "')";
      $(elem).css("background-image", url);
    }
    else if ($(elem).get(0).tagName == "IMG") {
      $(elem).attr("src", url);
    }
  }
});
