Einplayer.Backend.Views.TrackList = Backbone.View.extend({

  tagName: "div",
  className: "tracklist",
  requiredTemplates: [
    "TrackList"
  ],
  template: null,
  
  proxyEvents: { },
  eventsName: "XXtrackListEventsNoNameXX",
  rowDblClick: "noFnNameDefined",
  
  initialize: function() {
    this.trackList = this.options.trackList;
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("TrackList"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ trackList: this.trackList.toJSON() });
    $(this.el).attr("rowDblClick", this.rowDblClick);

    this.assignRowButtonImgs();
    
    Einplayer.Backend.Utils.proxyEvents(this, this.eventsName);
    
    return this.el;
  },
  
  assignRowButtonImgs: function() {     
    var playnowImgURL = "url('" +
                        chrome.extension.getURL("images/rowbutton-playnow.png") +
                        "')";
    $(this.el).find(".button.playnow").each(function(index, element) {
      $(element).css("background-image", playnowImgURL);
    });
    
    var removeImgURL = "url('" +
                        chrome.extension.getURL("images/rowbutton-remove.png") +
                        "')";
    $(this.el).find(".button.remove").each(function(index, element) {
      $(element).css("background-image", removeImgURL);
    });
    
    var queueImgURL = "url('" +
                        chrome.extension.getURL("images/rowbutton-queue.png") +
                        "')";
    $(this.el).find(".button.queue").each(function(index, element) {
      $(element).css("background-image", queueImgURL);
    });
  },
});

