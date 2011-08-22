Einplayer.Backend.TemplateManager = {

  packages: {},
  currentPackage: "default",
  requiredScripts: [
    "Player",
    "TrackList",
  ],

  init: function() {
    
    this.packages["default"] = Einplayer.Backend.Views;
  },

  setPackage: function(packageName) {
    if (packageName in this.packages) {
      this.currentPackage = packageName;
    }
    else {
      this.currentPackage = "default";
    }
  },

  getViewScript: function(scriptName) {
    return this.packages[this.currentPackage][scriptName];
  },

  getTemplate: function(templateName, packageName) {
    if (typeof packageName == "undefined") {
      packageName = this.currentPackage;
    }

    var packageTemplates = $("div#" + packageName + "-templates");
    var template =
      packageTemplates.children("script#" + templateName + "-template")
                      .first();

    return template;
  }
}
