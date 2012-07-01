Tapedeck.Backend.Views.TapedeckView = Backbone.View.extend({

  templateName: null,
  packageName: null,
  textTemplate: null,
  initialize: function() {
    var tMgr = Tapedeck.Backend.TemplateManager;
    if (typeof(this.init) != "undefined") {
      this.init();
    }
    this.templateName = Tapedeck.Backend.Utils.idToTemplateName(this.id);
    this.packageName = tMgr.currentPackage;

    this.textTemplate = tMgr.getTemplate(this.templateName, this.packageName);

    // pass the options to the view, and toJSON anything we can
    this.params = this.options;
    for (var paramName in this.options) {
      if (this.options[paramName] && typeof(this.options[paramName].toJSON) != "undefined") {
        this.params[paramName] = this.options[paramName].toJSON();
      }
    }
  },

  render: function(callback) {
    var self = this;
    var tMgr = Tapedeck.Backend.TemplateManager;

    var logStr = "Rendering view '" + self.templateName + "' with params '" +
                 JSON.stringify(self.params) + "'";
    self.log(logStr, tMgr.DEBUG_LEVELS.ALL);

    var message = {
      action: "render",
      templateName: self.templateName,
      packageName: self.packageName,
      params: self.params,
      textTemplate: self.textTemplate
    };
    Tapedeck.Backend.MessageHandler.messageSandbox(message, function(rendered) {
      self.el.innerHTML = rendered.el;
      callback(self.el);
    });
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
