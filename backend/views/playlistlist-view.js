Einplayer.Backend.Views.PlaylistList = Backbone.View.extend({

  tagName: "div",
  id: "playlist-list",
  requiredTemplates: [
    "PlaylistList"
  ],
  template: null,
  
  proxyEvents: {
    "mouseover #playlist-list-header": "showPlaylistList",
    "mouseleave #playlist-list": "hidePlaylistList",
  },
  eventsName: "playlistListEvents",
  
  initialize: function() {
    this.playlistList = this.options.playlistList;
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("PlaylistList"));
  },

  render: function() {
    this.el.innerHTML =  this.template
                             ({ playlistList : this.playlistList });

    this.assignRowButtonImgs();
    
    Einplayer.Backend.Utils.proxyEvents(this, this.eventsName);
    return this.el;
  },
   
  assignRowButtonImgs: function() {     
    var removePlaylistImgURL =
      "url('" +
      chrome.extension.getURL("images/rowbutton-remove.png") +
      "')";
    $(this.el).find(".button.removePlaylist").each(function(index, element) {
      $(element).css("background-image", removePlaylistImgURL);
    });
  },
  
});
