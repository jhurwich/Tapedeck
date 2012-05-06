Tapedeck.Backend.Views.Frame = Backbone.View.extend({

  tagName: "div",
  id: "tapedeck-content",
  requiredTemplates: [
    "Frame",
  ],
  template: null,

  proxyEvents: {
    "click #queue-save"    : "PlaylistList.saveQueue",
    "click #repeat"        : "toggleRepeat",
    "click #queue-shuffle" : "shuffleQueue",
    "click #queue-clear"   : "clearQueue",
  },
  eventsName: "frameEvents",

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
    Tapedeck.Backend.Utils.proxyEvents(this, this.eventsName);

    return this.el
  },

  renderPlayer: function() {
    var viewData = Tapedeck.Backend
                           .TemplateManager
                           .renderView("Player", { });
    var playerID = "player";
    viewData.el.id = playerID;

    $(this.el).find("#" + playerID).replaceWith(viewData.el);
    this.proxyEvents = _.extend(this.proxyEvents, viewData.proxyEvents);
  },

  renderQueue: function() {
    var queueTracks = Tapedeck.Backend.Sequencer.queue;
    var viewData = Tapedeck.Backend
                           .TemplateManager
                           .renderView("Queue",
                                       { trackList : queueTracks });

    $(this.el).find("#queue-list").replaceWith(viewData.el);
    this.proxyEvents = _.extend(this.proxyEvents, viewData.proxyEvents);
  },

  renderPlaylistList: function() {
    var playlistList = Tapedeck.Backend.Bank.getPlaylists();
    var viewData = Tapedeck.Backend
                           .TemplateManager
                           .renderView("PlaylistList",
                                       { playlistList : playlistList });

    $(this.el).find("#playlist-list").replaceWith(viewData.el);
    this.proxyEvents = _.extend(this.proxyEvents, viewData.proxyEvents);
  },

  renderBrowseRegion: function() {
    var viewData = Tapedeck.Backend
                           .TemplateManager
                           .renderView("BrowseRegion",
                                       { tabID : this.tabID });

    $(this.el).find("#browse-region").replaceWith(viewData.el);
    this.proxyEvents = _.extend(this.proxyEvents, viewData.proxyEvents);
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
