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

  getViewScript: function(scriptName, packageName) {
    if (typeof packageName == "undefined") {
      packageName = this.currentPackage;
    }
    return this.packages[packageName][scriptName];
  },

  getTemplate: function(templateName, packageName) {
    if (typeof packageName == "undefined") {
      packageName = this.currentPackage;
    }

    var templateSelector = "script#" + templateName + "-" + packageName + "-template"

    return $(templateSelector).html();
  }
}
