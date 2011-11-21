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
    this.trackList = this.options.trackList;
    if (typeof(this.options.currentCassette) != "undefined") {
      this.currentCassette = this.options.currentCassette;
    }

    this.bindEvents(this.trackList);
                       
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
    var trackListJSON = this.trackList.toJSON();
    trackListJSON.destination = this.viewName;
    var templateOptions = { trackList: trackListJSON };
    if (this.currentCassette != null) {
      templateOptions.currentCassette = this.currentCassette.toJSON();
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
    
    this.assignImgs(".button.eject", "cassettebutton-eject.png");
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

