describe("Template Manager", function() {

  beforeEach(function() {
    this.templateMgr = this.Tapedeck
                           .Backend
                           .TemplateManager;

    this.templateMgr.setPackage("default");
  });

  it("should get Backbone view constructors from getViewScript", function() {
    var Backbone = chrome.extension.getBackgroundPage().Backbone;

    for (var i = 0; i < this.templateMgr.requiredScripts.length; i++) {
      var scriptName = this.templateMgr.requiredScripts[i];
      var viewScript = this.templateMgr.getViewScript(scriptName);
      expect(viewScript.prototype instanceof Backbone.View).toBeTruthy();
    };
  });

  it("should get view templates from getTemplate", function() {
    for (var i = 0; i < this.templateMgr.requiredScripts.length; i++) {
      var scriptName = this.templateMgr.requiredScripts[i];
      var viewScript = this.templateMgr.getViewScript(scriptName);

      var requiredTemplates = viewScript.prototype.requiredTemplates;
      for (var j = 0; j < requiredTemplates.length; j++) {
        var templateName = requiredTemplates[j];
        var template = this.templateMgr.getTemplate(templateName);
        expect($(template)).toExist();
      }
    };
  });


});
