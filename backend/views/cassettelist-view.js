Einplayer.Backend.Views.CassetteList = Backbone.View.extend({

  tagName: "div",
  id: "cassette-list",
  className: "cassettelist",
  requiredTemplates: [
    "CassetteList"
  ],
  template: null,
  
  proxyEvents: { },
  eventsName: "cassetteListEvents",
  
  initialize: function() {
    this.cassetteList = this.options.cassetteList;
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("CassetteList"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ cassetteList: this.cassetteList.toJSON() });

    Einplayer.Backend.Utils.proxyEvents(this, this.eventsName);

    return this.el;
  },

});
