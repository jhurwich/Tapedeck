Tapedeck.Backend.Views.Modal = Backbone.View.extend({

  tagName: "div",
  id: "modal-container",
  requiredTemplates: [
    "Modal"
  ],
  template: null,
  
  proxyEvents: {
    
  },
  eventsName: "modalEvents",
  
  initialize: function() {
    this.params = this.options;
    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate("Modal"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ params: this.params });

    this.assignImg("close-button", "modal-close.png");
    
    Tapedeck.Backend.Utils.proxyEvents(this, this.eventsName);

    return this.el;
  },

  assignImg: function(elemID, image) {
    var elem = $(this.el).find("#" + elemID).first();
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
