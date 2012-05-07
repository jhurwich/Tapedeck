Tapedeck.Backend.TemplateManager = {

  packages: {},
  currentPackage: "default",
  requiredScripts: [
    "Frame",
    "Player",
    "PlaylistList",
    "TrackList",
    "Queue",
    "BrowseRegion",
    "BrowseList",
    "CassetteList"
  ],

  init: function() {
    this.packages["default"] = Tapedeck.Backend.Views;

    // will receive [{ name: "", contents: "", url: "" }]
    Tapedeck.Backend.Bank.FileSystem.getTemplates(function(templateDatas) {

    });
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

    console.log("getEvents for " + scriptName);
    return { el: el, proxyEvents: view.getEvents() };
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

    // first get the contents of the template
    var templateSelector = "script#" + templateName + "-" + packageName + "-template";

    var html = $(templateSelector).html();

    // now populate it with all reference templates as if they were present
    var selfClosedTagRegex = function(tag) {
      return new RegExp("<\s*" + tag + "[^<>]*\/>", "gi");
    }

    var templateMatch = null;
    templateTagRegex = selfClosedTagRegex("template");
    while ((templateMatch = templateTagRegex.exec(html)) != null) {
      var templateTag = templateMatch[0];
      var subtemplateSelector = templateTag.match(/ref\s*?=\s*?['"]([^'"]*)['"]/)[1];

      console.log(subtemplateSelector);
      var includeHTML = $("#" + subtemplateSelector).html()
      console.log("include: " + includeHTML);
      html = html.replace(templateTag, includeHTML);
      console.log(templateName + " - " + html);
    }

    return html;
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
