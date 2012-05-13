Tapedeck.Backend.Views.TapedeckView = Backbone.View.extend({

  textTemplate: null,
  template: null,
  initialize: function() {

    if (typeof(this.init) != "undefined") {
      this.init();
    }

    // the template name is the id, each word separated by dashes capitalized and concated
    var templateName = Tapedeck.Backend.Utils.idToTemplateName(this.id);

    this.textTemplate = Tapedeck.Backend.TemplateManager.getTemplate(templateName)
    this.template = _.template(this.textTemplate);

    // pass the options to the view, and toJSON anything we can
    this.params = this.options;
    for (var paramName in this.options) {
      if (this.options[paramName] && typeof(this.options[paramName].toJSON) != "undefined") {
        this.params[paramName] = this.options[paramName].toJSON();
      }
      if (paramName == "playlistList") {
        console.log(JSON.stringify(this.params[paramName]));
      }
    }
  },

  render: function() {
    this.el.innerHTML =  this.template({ params: this.params });

    return this.el;
  },

  getEvents: function() {
    return Tapedeck.Backend.Utils.extractTagAsObject(this.textTemplate, "events");
  },

  getOptions: function() {
    return Tapedeck.Backend.Utils.extractTagAsObject(this.textTemplate, "options");
  },

  getImages: function() {
    return Tapedeck.Backend.Utils.extractTagAsObject(this.textTemplate, "images");
  }

});
