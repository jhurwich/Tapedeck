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

    var logStr = "Rendering TapedeckView '" + self.templateName + "' with params '" +
                 JSON.stringify(self.params) + "'";
    self.log(logStr);

    var message = {
      action: "render",
      templateName: self.templateName,
      packageName: self.packageName,
      params: self.params,
      textTemplate: self.textTemplate,
    };

    try {
      Tapedeck.Backend.MessageHandler.messageSandbox(message, function(response) {
        self.el.innerHTML = response.rendered;
        self.log("Received generated HTML from Sandbox");
        callback(self.el);
      });

    } catch(error) {
      console.error("ERROR in view rendering -" + JSON.stringify(error));
    }
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
