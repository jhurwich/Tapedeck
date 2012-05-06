Tapedeck.Backend.Views.TapedeckView = Backbone.View.extend({

  template: null,
  initialize: function() {

    // the template name is the id, each word separated by dashes capitalized and concated
    var templateName = this.id;
    var dashIndex = -1;
    while((dashIndex = templateName.indexOf('-')) != -1) {
      templateName = templateName.substring(0, dashIndex) +
                     templateName.charAt(dashIndex + 1).toUpperCase() +
                     templateName.substring(dashIndex + 2);
    }
    templateName = templateName.charAt(0).toUpperCase() + templateName.substring(1);

    this.template = _.template(Tapedeck.Backend
                                       .TemplateManager
                                       .getTemplate(templateName));

    if (typeof(this.init) != "undefined") {
      this.init();
    }
  },

  getEvents: function() {

  },

});
