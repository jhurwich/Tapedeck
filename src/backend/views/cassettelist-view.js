Tapedeck.Backend.Views.CassetteList = Backbone.View.extend({

  tagName: "div",
  className: "cassettelist-container",
  id: "cassette-list",
  requiredTemplates: [
    "CassetteList"
  ],
  template: null,
  
  proxyEvents: {
    "click .cassettelist .row" : "CassetteList.rowClick",
  },
  eventsName: "cassetteListEvents",
  
  initialize: function() {
    this.cassetteList = this.options.cassetteList;
    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate("CassetteList"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ cassetteList: this.cassetteList.toJSON() });

    Tapedeck.Backend.Utils.proxyEvents(this, this.eventsName);

    return this.el;
  },

});
