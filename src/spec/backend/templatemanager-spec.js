describe("Template Manager", function() {

  beforeEach(function() {
    this.tMgr = this.Tapedeck
                           .Backend
                           .TemplateManager;

    this.tMgr.setPackage("default");

    var self = this;
    self.waitsForAddTestTemplate = function() {
      var doneSaving = false;
      self.templateCode = null;
      self.cssCode = null;
      var trySave = function() {
        if (self.templateCode != null && self.cssCode != null) {
          self.tMgr.addTemplate(self.templateCode, self.cssCode, "spec", function() {
            doneSaving = true;
          });
        }
      };

      self.templateURL = chrome.extension.getURL("spec/data/spec-skin.html");
      $.ajax({
        type: "GET",
        url: self.templateURL,
        dataType: "text",
        success : function(aTemplateCode) {
          self.templateCode = aTemplateCode;
          trySave();
        },
        error : function(xhr, status) {
          console.error("Error getting spec-skin.html: " + status);
        }
      });

      self.cssURL = chrome.extension.getURL("spec/data/spec-skin.css");
      $.ajax({
        type: "GET",
        url: self.cssURL,
        dataType: "text",
        success : function(aCSSCode) {
          self.cssCode = aCSSCode;
          trySave();
        },
        error : function(xhr, status) {
          console.error("Error getting spec-skin.css: " + status);
        }
      });

      waitsFor(function() { return doneSaving; },
               "Waiting for saving template",
               2000);
    };

    this.waitsForBackendInit();
  });

  it("should get Backbone view constructors from getViewScript", function() {
    var Backbone = chrome.extension.getBackgroundPage().Backbone;

    for (var i = 0; i < this.tMgr.requiredScripts.length; i++) {
      var scriptName = this.tMgr.requiredScripts[i];
      var viewScript = this.tMgr.getViewScript(scriptName);
      expect(viewScript.prototype instanceof Backbone.View).toBeTruthy();
    }
  });

  it("should get view templates from getTemplate", function() {
    var expectTemplateToExist = function(template) {
      expect($(template)).toExist();
    };

    for (var i = 0; i < this.tMgr.requiredScripts.length; i++) {
      var scriptName = this.tMgr.requiredScripts[i];
      var viewScript = this.tMgr.getViewScript(scriptName);

      var requiredTemplates = viewScript.prototype.requiredTemplates;
      for (var j = 0; j < requiredTemplates.length; j++) {

        var templateName = requiredTemplates[j];
        this.tMgr.getTemplate(templateName, expectTemplateToExist);
      }
    }
  });

  it("should save and retrieve templates", function() {
    var self = this;
    var testComplete = false;
    var recoveredOptions = self.recoverOptions();

    self.waitsForAddTestTemplate();
    runs(function() {
      self.Tapedeck.Backend.Bank.FileSystem.getTemplates(function(datas) {

        // ensure that we have one default template and the test template
        var numExpected = 2;
        if (recoveredOptions.devTemplates !== "") {
          numExpected++;
        }

        expect(datas.length).toEqual(numExpected);

        for (var i = 0; i < datas.length; i++) {
          var data = datas[i];
          // we've loaded one test template into the filesystem, check it
          if (data.url.indexOf("filesystem:chrome-extension://") != -1) {
            expect(data.contents).toEqual(self.templateCode);
            expect(data.cssURL).toMatch("filesystem:chrome-extension://[A-Za-z]*\/temporary/CSS/" + data.name);
          }
          else {
            // otherwise we're considering the default on background.html and/or something from the conf options
            if (data.url.indexOf("background.html") == -1 &&
                data.url.indexOf(recoveredOptions.devTemplates.url) == -1) {
              expect(data.url).toEqual("background.html or " + recoveredOptions.devTemplates.url + " from options");
            }
          }
        }
        testComplete = true;
      });
      waitsFor(function() { return testComplete; },
               "Waiting for saving and checking template",
               2000);

      runs(function() {
        expect(testComplete).toBeTruthy();
      });
    });
  });

  it("should switch skins", function() {
    var self = this;
    var testComplete = false;
    var recoveredOptions = self.recoverOptions();

    // without test loaded, this should go to default package
    self.tMgr.setPackage("spec");
    expect(self.tMgr.currentPackage).toEqual("default");

    // load the test skin and try to change to it
    self.waitsForAddTestTemplate();
    runs(function() {
      self.Tapedeck.Backend.Bank.FileSystem.getTemplates(function(datas) {
        var names = _.map(datas, function (value) { return value.name; });
        var numTemplatesExpected = 2;
        if (typeof(recoveredOptions.devTemplates) != "undefined" &&
            recoveredOptions.devTemplates &&
            !$.isEmptyObject(recoveredOptions.devTemplates)) {
          numTemplatesExpected++;
        }
        expect(datas.length).toEqual(numTemplatesExpected);

        self.Tapedeck.Backend.TemplateManager.setPackage("spec");
        expect(self.tMgr.currentPackage).toEqual("spec");

        // we've changed to the test package, let's make sure we get its templates now
        var textTemplate = self.tMgr.getTemplate("Frame", function(textTemplate) {
          expect($(textTemplate).find("#this-is-the-spec-template").length > 0).toBeTruthy();
          testComplete = true;
        });
      });
    });
    waitsFor(function() { return testComplete; },
         "Waiting for saving and switching template",
         2000);
    runs(function() {
      expect(testComplete).toBeTruthy();
      self.Tapedeck.Backend.TemplateManager.setPackage("default");
    });
  });
});