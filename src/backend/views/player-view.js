Tapedeck.Backend.Views.Player = Tapedeck.Backend.Views.TapedeckView.extend({

  tagName: "div",
  id: "player",
  requiredTemplates: [
    "Player"
  ],
  template: null,

  proxyEvents: {
    "mouseover #seek-slider #handle": "Player.SeekSlider.mouseoverHandle",
    "mouseleave #seek-slider #handle": "Player.SeekSlider.mouseleaveHandle",
    "mousedown #seek-slider #handle": "Player.SeekSlider.downOnHandle",

    "mousedown #volume-slider #handle": "Player.VolumeSlider.downOnHandle",

    "mouseup": "Player.mouseUp",
    "onreplace": "onFrameRender"
  },

  render: function() {
    var player = Tapedeck.Backend.Sequencer.Player;
    var currentState = Tapedeck.Backend.Sequencer.getCurrentState();
    var currentTrack = Tapedeck.Backend.Sequencer.getCurrentTrack();

    var options = { state: currentState };
    if (typeof(currentTrack) != "undefined" &&
        currentTrack != null &&
        !($.isEmptyObject(currentTrack))) {
      options.track = currentTrack.toJSON();
    }
    this.el.innerHTML =  this.template(options);

    this.assignSliderImgs();

    return this.el;
  },

  assignSliderImgs: function() {
    this.assignImg("#seek-slider #track-left", "seekslider-track-left.png");
    this.assignImg("#seek-slider #track-right", "seekslider-track-right.png");
    this.assignImg("#seek-slider #handle-image", "seekslider-handle.png");

    this.assignImg("#volume-slider #track-top", "volumeslider-track-top.png");
    this.assignImg("#volume-slider #track-bottom", "volumeslider-track-bottom.png");
    this.assignImg("#volume-slider #handle-image", "volumeslider-handle.png");
  },

  assignImg: function(selector, image) {
    var elem = $(this.el).find(selector).first();

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
