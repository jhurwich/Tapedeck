Tapedeck.Backend.Views.CassetteList = Backbone.View.extend({

  tagName: "div",
  className: "cassettelist-container",
  id: "cassette-list",
  requiredTemplates: [
    "CassetteList"
  ],
  template: null,
  
  proxyEvents: {
    "click .cassettelist .row"        : "CassetteList.rowClick",
    "mouseover #add-cassettes-button"  : "CassetteList.showCassetteMenu",
    "mouseleave #add-cassettes-menu" : "CassetteList.hideCassetteMenu",
  },
  eventsName: "cassetteListEvents",
  
  initialize: function() {
    this.cassetteList = this.options.cassetteList;
    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate("CassetteList"));
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

    Tapedeck.Backend.Utils.proxyEvents(this, this.eventsName);

    return this.el;
  },

});
