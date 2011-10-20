Einplayer.Backend.Views.Player = Backbone.View.extend({

  tagName: "div",
  id: "player",
  requiredTemplates: [
    "Player"
  ],
  template: null,

  proxyEvents: {
    "mouseover #handle": "mouseoverHandle",
    "mouseleave #handle": "mouseleaveHandle",
    "mousedown #handle": "downOnHandle",
    "mouseup": "mouseUp",
    "onreplace": "onFrameRender"
  },
  
  initialize: function() {
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("Player"));
  },
  
  render: function() {
    var player = Einplayer.Backend.Sequencer.Player;
    var currentState = Einplayer.Backend.Sequencer.getCurrentState();
    var currentTrack = Einplayer.Backend.Sequencer.getCurrentTrack();

    var options = { state: currentState };
    if (typeof(currentTrack) != "undefined" &&
        currentTrack != null &&
        !($.isEmptyObject(currentTrack))) {
      options.track = currentTrack.toJSON();
    }
    this.el.innerHTML =  this.template(options);
    
    this.assignSliderImgs();

    Einplayer.Backend.Utils.proxyEvents(this, "playerEvents");
    
    return this.el;
  },

  assignSliderImgs: function() {
    this.assignImg("track-left", "slider-track-left.png");
    this.assignImg("track-right", "slider-track-right.png");
    this.assignImg("handle-image", "slider-handle.png");
  },

  assignImg: function(elemID, image) {
    var elem = $(this.el).find("#" + elemID).first();
    var url = chrome.extension.getURL("images/" + image);
    console.log(elemID + " to " + image + " tag:"+ $(elem).get(0).tagName);
    if ($(elem).get(0).tagName == "DIV") {
      url = "url('" + url + "')";
      $(elem).css("background-image", url);
    }
    else if ($(elem).get(0).tagName == "IMG") {
      $(elem).attr("src", url);
    }
  }
});
