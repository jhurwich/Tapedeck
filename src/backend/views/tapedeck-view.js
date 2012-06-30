Tapedeck.Backend.Views.TapedeckView = Backbone.View.extend({

  textTemplate: null,
  template: null,
  initialize: function() {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (typeof(this.init) != "undefined") {
      this.init();
    }

    // the template name is the id, each word separated by dashes capitalized and concated
    var templateName = Tapedeck.Backend.Utils.idToTemplateName(this.id);
    this.log("Initializing view for '" + templateName + "'", tMgr.DEBUG_LEVELS.ALL);

    this.textTemplate = tMgr.getTemplate(templateName);

    this.log("Compiling template '" + templateName + "'", tMgr.DEBUG_LEVELS.ALL);
    this.template = _.template(this.textTemplate);

    // pass the options to the view, and toJSON anything we can
    this.params = this.options;
    for (var paramName in this.options) {
      if (this.options[paramName] && typeof(this.options[paramName].toJSON) != "undefined") {
        this.params[paramName] = this.options[paramName].toJSON();
      }
    }
  },

  render: function() {
    var logStr = "Rendering view '" + Tapedeck.Backend.Utils.idToTemplateName(this.id) +
                 "' with params '" + JSON.stringify(this.params) + "'";
    this.log(logStr, Tapedeck.Backend.TemplateManager.DEBUG_LEVELS.ALL);

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
  },

  // TapedeckView's log is controlled by the Template Manager's debug setting
  log: function(str, level) {
    var self = Tapedeck.Backend.TemplateManager;
    if (self.debug == self.DEBUG_LEVELS.NONE) {
      return;
    }
    if (typeof(level) == "undefined") {
      level = self.DEBUG_LEVELS.BASIC;
    }
    if (self.debug >= level) {
      var currentTime = new Date();
      console.log("TapedeckView (" + currentTime.getTime() + ") : " + str);
    }
  }

});
