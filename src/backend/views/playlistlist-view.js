Tapedeck.Backend.Views.PlaylistList = Backbone.View.extend({

  tagName: "div",
  id: "playlist-list",
  requiredTemplates: [
    "PlaylistList"
  ],
  template: null,
  
  proxyEvents: {
    "mouseover #playlist-list-header" : "PlaylistList.showPlaylistList",
    "mouseleave #playlist-list"       : "PlaylistList.hidePlaylistList",
  },
  eventsName: "playlistListEvents",
  
  initialize: function() {
    this.playlistList = this.options.playlistList;
    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate("PlaylistList"));
  },

  render: function() {
    this.el.innerHTML =  this.template
                             ({ playlistList : this.playlistList });

    this.assignRowButtonImgs();
    
    Tapedeck.Backend.Utils.proxyEvents(this, this.eventsName);
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
