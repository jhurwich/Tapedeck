Tapedeck.Backend.Views.CassetteList = Tapedeck.Backend.Views.TapedeckView.extend({

  tagName: "div",
  className: "cassettelist-container",
  id: "cassette-list",
  requiredTemplates: [
    "CassetteList"
  ],
  template: null,

  eventsName: "cassetteListEvents",

  init: function() {
    this.cassetteList = this.options.cassetteList;
  },

  assignRowButtonImgs: function() {
    this.assignImgs("#add-cassettes-button", "plusbutton.png");
    this.assignImgs(".button.remove", "cassetteremove.png");
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

  render: function() {
    this.el.innerHTML =  this.template({ cassetteList: this.cassetteList.toJSON() });

    this.assignRowButtonImgs();

    return this.el;
  },

});
