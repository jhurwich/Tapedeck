Tapedeck.Backend.Views.PlaylistList = Tapedeck.Backend.Views.TapedeckView.extend({

  tagName: "div",
  id: "playlist-list",
  requiredTemplates: [
    "PlaylistList"
  ],
  template: null,

  eventsName: "playlistListEvents",

  init: function() {
    this.playlistList = this.options.playlistList;
  },

  render: function() {
    this.el.innerHTML =  this.template
                             ({ playlistList : this.playlistList });

    this.assignRowButtonImgs();
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
