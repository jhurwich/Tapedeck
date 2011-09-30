Einplayer.Backend.Views.Player = Backbone.View.extend({

  tagName: "div",
  id: "player",
  requiredTemplates: [
    "Player"
  ],
  template: null,

  proxyEvents: {
    "mousedown #handle": "downOnHandle",
    "mouseup": "mouseUp"
  },
  
  initialize: function() {
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("Player"));
  },
  
  render: function(state, track, progress) {    
    switch(state) {
      case Einplayer.Backend.Sequencer.STOP:

        break;
      case Einplayer.Backend.Sequencer.LOAD:

        break;
      case Einplayer.Backend.Sequencer.PAUSE:

        break;
      case Einplayer.Backend.Sequencer.PLAY:

        break;
        
    }
    this.el.innerHTML =  this.template({ });
    this.assignSliderImgs();

    Einplayer.Backend.Utils.proxyEvents(this);
    
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
