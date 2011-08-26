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

  renderView: function(scriptName, options, packageName) {
    var viewScript = this.getViewScript(scriptName, packageName);
    var view = new viewScript(options);
    
    return view.render();
  },

  getViewScript: function(scriptName, packageName) {
    if (!this.isValidPackage(packageName)) {
      packageName = this.currentPackage;
    }
    if (!this.packages[packageName]) console.log("no pkg");
    if (!this.packages[packageName][scriptName]) console.log("no script");
    return this.packages[packageName][scriptName];
  },

  getTemplate: function(templateName, packageName) {
    if (!this.isValidPackage(packageName)) {
      packageName = this.currentPackage;
    }

    var templateSelector = "script#" + templateName + "-" + packageName + "-template"

    return $(templateSelector).html();
  },

  isValidPackage: function(packageName) {
    if (typeof packageName == "undefined" ||
        !packageName ||
        packageName.length <= 0) {
      return false;
    }
    return (packageName in this.packages) ;
  },
}
