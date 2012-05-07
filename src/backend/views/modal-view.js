Tapedeck.Backend.Views.Modal = Tapedeck.Backend.Views.TapedeckView.extend({

  tagName: "div",
  id: "modal",
  requiredTemplates: [
    "Modal"
  ],
  template: null,

  eventsName: "modalEvents",

  init: function() {
    this.params = this.options;
  },

  render: function() {
    this.el.innerHTML =  this.template({ params: this.params });

    this.assignImg("close-button", "modal-close.png");

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
