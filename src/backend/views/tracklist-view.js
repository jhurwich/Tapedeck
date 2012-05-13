Tapedeck.Backend.Views.TrackList = Tapedeck.Backend.Views.TapedeckView.extend({

  tagName: "div",
  className: "tracklist-container",
  requiredTemplates: [
    "TrackList"
  ],
  template: null,

  viewName: "XXundefinedViewNameXX", // populated by concrete class

  init: function() {
    if (this.options.trackList != null &&
        typeof(this.options.trackList) != "undefined") {
      this.bindEvents(this.options.trackList);
      this.options.trackList = this.options.trackList.toJSON();
      this.options.trackList.destination = this.viewName;
    }
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

  updateView: function(self) {
    var viewID = self.id;
    Tapedeck.Backend.MessageHandler.pushView(viewID,
                                             self.render(),
                                             self.proxyEvents);
  },
});

