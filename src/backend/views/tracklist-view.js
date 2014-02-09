Tapedeck.Backend.Views.TrackList = Tapedeck.Backend.Views.TapedeckView.extend({

  tagName: "div",
  templateID: "trackList",
  className: "tracklist-container",
  requiredTemplates: [
    "TrackList"
  ],
  template: null,

  viewName: "XXundefinedViewNameXX", // populated by concrete class

  init: function() {
    if (this.options.trackList != null &&
        typeof(this.options.trackList) != "undefined") {
      this.options.trackList = this.options.trackList.toJSON();
    }
  }

});

