Tapedeck.Backend.Views.TapedeckView = Backbone.View.extend({

  templateName: null,
  packageName: null,
  textTemplate: null,
  initComplete: false,
  initialize: function() {
    var tMgr = Tapedeck.Backend.TemplateManager;
    var self = this;
    if (typeof(self.init) != "undefined") {
      self.init();
    }
    self.templateName = Tapedeck.Backend.Utils.idToTemplateName(self.id);
    self.packageName = tMgr.currentPackage;

    tMgr.getTemplate(self.templateName, self.packageName, function(template) {
      self.textTemplate = template;
      self.finishInit();
    });

    // pass the options to the view, and toJSON anything we can
    self.params = self.options;
    for (var paramName in self.options) {
      if (self.options[paramName] && typeof(self.options[paramName].toJSON) != "undefined") {
        self.params[paramName] = self.options[paramName].toJSON();
      }
    }
  },

  // once textTemplate is populated, init is finished
  finishInit: function() {
    this.initComplete = true;
  },

  render: function(callback) {
    var self = this;
    var tMgr = Tapedeck.Backend.TemplateManager;

    var logStr = "Rendering TapedeckView '" + self.templateName + "' with params '" +
                 JSON.stringify(self.params) + "'";
    self.log(logStr);

    var doRender = function() {
      var message = {
        action: "render",
        templateName: self.templateName,
        packageName: self.packageName,
        params: self.params,
        textTemplate: self.textTemplate
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
    }; // end doRender

    // we beat the template populating
    if (self.textTemplate == null) {
      tMgr.getTemplate(self.templateName, self.packageName, function(template) {
        self.textTemplate = template;
        doRender();
      });
    }
    else {
      doRender();
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
    Tapedeck.Backend.Utils.log("TemplateManager", "(TapedeckView) " + str, level);
  }

});
