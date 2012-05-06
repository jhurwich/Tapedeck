Tapedeck.Backend.Views.CassetteList = Tapedeck.Backend.Views.TapedeckView.extend({

  tagName: "div",
  className: "cassettelist-container",
  id: "cassette-list",
  requiredTemplates: [
    "CassetteList"
  ],
  template: null,

  proxyEvents: {
    "click .cassettelist .row"            : "CassetteList.rowClick",
    "mouseover #add-cassettes-button"     : "CassetteList.showCassetteMenu",
    "mouseleave #add-cassettes-menu"      : "CassetteList.hideCassetteMenu",
    "click .cassettelist .developer-link" : "CassetteList.loadDeveloperLink",
    "click .cassettelist .remove"         : "CassetteList.rowButtonRemove",

    "click #add-cassettes-menu #add-cassettes-button" : "CassetteList.cassettify",
    "click #add-cassettes-menu .menu-row.cassettify"  : "CassetteList.cassettify",
  },
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
