Tapedeck.Backend.Views.TrackList = Backbone.View.extend({

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
    if (this.options.trackList != null &&
        typeof(this.options.trackList) != "undefined") {
      this.trackList = this.options.trackList;
      this.bindEvents(this.trackList);
    }
    else {
      // tracklist == null usually means the tracklist is loading
      this.trackList = null;
    }
    if (typeof(this.options.currentCassette) != "undefined") {
      this.currentCassette = this.options.currentCassette;
    }
    if (typeof(this.options.currentPage) != "undefined") {
      this.currentPage = this.options.currentPage;
    }

    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate("TrackList"));
  },

  bindEvents: function(trackList) {
    // There can only be one view of a tracklist receiving updates.
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
    var templateOptions = { };
    
    if (this.trackList != null) {
      var trackListJSON = this.trackList.toJSON();
      trackListJSON.destination = this.viewName;
      templateOptions.trackList = trackListJSON;
    }
    if (this.currentCassette != null) {
      templateOptions.currentCassette = this.currentCassette;

      if (this.currentPage != null) {
        templateOptions.currentPage = this.currentPage;
      }
    }
    this.el.innerHTML =  this.template(templateOptions);
    $(this.el).attr("rowDblClick", this.rowDblClick);

    this.assignRowButtonImgs();
    
    Tapedeck.Backend.Utils.proxyEvents(this, this.eventsName);
    
    return this.el;
  },
  
  assignRowButtonImgs: function() {
    this.assignImgs(".button.playnow", "rowbutton-playnow.png");
    this.assignImgs(".button.remove", "rowbutton-remove.png");
    this.assignImgs(".button.queue", "rowbutton-queue.png");
    this.assignImgs(".button.download", "rowbutton-download.png");
    this.assignImgs(".spinner.download", "download-spinner.gif");
    
    this.assignImgs(".button.prev-page", "prev-page.png");
    this.assignImgs(".button.next-page", "next-page.png");
    this.assignImgs(".button.eject", "cassettebutton-eject.png");
    
    this.assignImgs(".spinner.loading", "tracklist-loading.gif");
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
    Tapedeck.Backend.MessageHandler.pushView(viewID,
                                             self.render());
  },
});

