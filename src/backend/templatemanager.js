Tapedeck.Backend.TemplateManager = {

  packages: {},
  currentPackage: "default",
  requiredScripts: [
    "Frame",
    "Player",
    "TrackList",
    "Queue",
    "BrowseList",
    "PlaylistList"
  ],

  init: function() {
    this.packages["default"] = Tapedeck.Backend.Views;
  },

  setPackage: function(packageName) {
    if (packageName in this.packages) {
      this.currentPackage = packageName;
    }
    else {
      this.currentPackage = "default";
    }
  },

  // returns an object of the form { el: __, proxyEvents: __ }
  renderView: function(scriptName, options, packageName) {
    if (typeof(options) == "undefined") {
      options = { };
    }
    var viewScript = this.getViewScript(scriptName, packageName);
    var view = new viewScript(options);

    var el = view.render();
    return { el: el, proxyEvents: view.proxyEvents };
  },

  getViewScript: function(scriptName, packageName) {
    if (!this.isValidPackage(packageName)) {
      packageName = this.currentPackage;
    }

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
