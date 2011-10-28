Einplayer.Backend.Views.TrackList = Backbone.View.extend({

  tagName: "div",
  className: "tracklist-container",
  requiredTemplates: [
    "TrackList"
  ],
  template: null,

  viewName: "XXundefinedViewNameXX",
  proxyEvents: { },
  eventsName: "XXtrackListEventsNoNameXX",
  rowDblClick: "noFnNameDefined",
  
  initialize: function() {
    this.trackList = this.options.trackList;

    this.bindEvents(this.trackList);
                       
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("TrackList"));
  },

  bindEvents: function(trackList) {
    // There can only be one view of a tracklist reciving updates.
    // Clear out the events for any other views
    trackList.unbind('add');
    trackList.unbind('remove');
    trackList.unbind('reset');
    trackList.unbind('change tracks');

    trackList.bind('add', this.updateView.curry(this));
    trackList.bind('remove', this.updateView.curry(this));
    trackList.bind('reset', this.updateView.curry(this));
    trackList.bind('change tracks', this.updateView.curry(this));
  },

  render: function() {
    this.el.innerHTML =  this.template({ trackList: this.trackList.toJSON() });
    $(this.el).attr("rowDblClick", this.rowDblClick);

    this.assignRowButtonImgs();
    
    Einplayer.Backend.Utils.proxyEvents(this, this.eventsName);
    
    return this.el;
  },
  
  assignRowButtonImgs: function() {     
    this.assignImgs(".button.playnow", "rowbutton-playnow.png");
    this.assignImgs(".button.remove", "rowbutton-remove.png");
    this.assignImgs(".button.queue", "rowbutton-queue.png");
    this.assignImgs(".button.download", "rowbutton-download.png");
  },
  
  assignImgs: function(selector, image) {
    $(this.el).find(selector).each(function(index, elem) {
      var url = chrome.extension.getURL("images/" + image);
      if ($(elem).get(0).tagName == "DIV") {
        url = "url('" + url + "')";
        $(elem).css("background-image", url);
      }
      else if ($(elem).get(0).tagName == "IMG") {
        $(elem).attr("src", url);
      }
    });
  },
  
  updateView: function(self) {
    var viewID = self.id;
    Einplayer.Backend.MessageHandler.pushView(viewID,
                                              self.render());
  },
});

