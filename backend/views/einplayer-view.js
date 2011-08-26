Einplayer.Backend.Views.Player = Backbone.View.extend({

  tagName: "div",
  className: "player",
  requiredTemplates: [
    "Player",
  ],
  template: null,

  initialize: function() {
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("Player"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ });
    return this.el;
  },
});
