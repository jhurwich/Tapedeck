Einplayer.Backend.Views.Player = Backbone.View.extend({

  tagName: "div",
  id: "player",
  requiredTemplates: [
    "Player"
  ],
  template: null,

  proxyEvents: {
    "mousedown #handle": "downOnHandle",
    "mouseup": "mouseUp",
    "onreplace": "forceSliderUpdate"
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
    var trackLeft = $(this.el).find("#track-left").first();
    var leftImgURL = "url('" +
                     chrome.extension.getURL("images/slider-track-left.png") +
                     "')";
    $(trackLeft).css("background-image", leftImgURL);

    var trackRight = $(this.el).find("#track-right").first();
    var rightImgURL = "url('" +
                      chrome.extension.getURL("images/slider-track-right.png") +
                      "')";
    $(trackRight).css("background-image", rightImgURL);

    var handle = $(this.el).find("#handle-image").first();
    $(handle).attr("src",
                   chrome.extension.getURL("images/slider-handle.png"));

  },



});
