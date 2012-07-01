describe("Template Manager", function() {

  beforeEach(function() {
    this.tMgr = this.Tapedeck
                           .Backend
                           .TemplateManager;

    this.tMgr.setPackage("default");

    var self = this;
    self.waitForAddTestTemplate = function() {
      var doneSaving = false;
      self.templateCode = null;
      self.cssCode = null;
      var trySave = function() {
        if (self.templateCode != null && self.cssCode != null) {
          self.tMgr.addTemplate(self.templateCode, self.cssCode, "test", function() {
            doneSaving = true;
          });
        }
      };

      var templateURL = chrome.extension.getURL("spec/data/test-skin.html");
      $.ajax({
        type: "GET",
        url: templateURL,
        dataType: "text",
        success : function(aTemplateCode) {
          self.templateCode = aTemplateCode;
          trySave();
        },
        error : function(xhr, status) {
          console.error("Error getting test-skin.html: " + status);
        }
      });

      var cssURL = chrome.extension.getURL("spec/data/test-skin.css");
      $.ajax({
        type: "GET",
        url: cssURL,
        dataType: "text",
        success : function(aCSSCode) {
          self.cssCode = aCSSCode;
          trySave();
        },
        error : function(xhr, status) {
          console.error("Error getting test-skin.html: " + status);
        }
      });

      waitsFor(function() { return doneSaving },
               "Waiting for saving template",
               2000);
    };

    var spy = spyOn(self.Tapedeck.Backend.Bank.FileSystem, "getTemplates")
                   .andCallThrough();
    self.Tapedeck.Backend.TemplateManager.init();

    waitsFor(function() {
      return spy.callCount >= 2;
    }, "Waiting for TemplateManager.init()", 3000);
  });

  it("should get Backbone view constructors from getViewScript", function() {
    var Backbone = chrome.extension.getBackgroundPage().Backbone;

    for (var i = 0; i < this.tMgr.requiredScripts.length; i++) {
      var scriptName = this.tMgr.requiredScripts[i];
      var viewScript = this.tMgr.getViewScript(scriptName);
      expect(viewScript.prototype instanceof Backbone.View).toBeTruthy();
    };
  });

  it("should get view templates from getTemplate", function() {
    for (var i = 0; i < this.tMgr.requiredScripts.length; i++) {
      var scriptName = this.tMgr.requiredScripts[i];
      var viewScript = this.tMgr.getViewScript(scriptName);

      var requiredTemplates = viewScript.prototype.requiredTemplates;
      for (var j = 0; j < requiredTemplates.length; j++) {
        var templateName = requiredTemplates[j];
        var template = this.tMgr.getTemplate(templateName);
        expect($(template)).toExist();
      }
    };
  });

  it("should save and retrieve templates", function() {
    var self = this;
    var testComplete = false;

    self.waitForAddTestTemplate();
    runs(function() {
      self.Tapedeck.Backend.Bank.FileSystem.getTemplates(function(datas) {

        // ensure that we have one default template and the test template
        expect(datas.length).toEqual(2);

        for (var i = 0; i < datas.length; i++) {
          var data = datas[i];

          if(data.name == "test") {
            var checkTemplateCode = data.contents;
            var checkCSSCode = data.cssContents;
            expect(self.templateCode).toEqual(checkTemplateCode);
            expect(self.cssCode).toEqual(checkCSSCode);
            testComplete = true;
          }
        }
      });
      waitsFor(function() { return testComplete },
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

    // without test loaded, this should go to default package
    self.tMgr.setPackage("test");
    expect(self.tMgr.currentPackage).toEqual("default");

    // load the test skin and try to change to it
    self.waitForAddTestTemplate();
    runs(function() {
      self.Tapedeck.Backend.Bank.FileSystem.getTemplates(function(datas) {
        expect(datas.length).toEqual(2);

        self.Tapedeck.Backend.TemplateManager.setPackage("test");
        expect(self.tMgr.currentPackage).toEqual("test");

        // we've changed to the test package, let's make sure we get its templates now
        var textTemplate = self.tMgr.getTemplate("Frame");
        expect($(textTemplate).find("#this-is-the-test-template").length > 0).toBeTruthy();
        testComplete = true;
      });
    });
    waitsFor(function() { return testComplete },
         "Waiting for saving and switching template",
         2000);
    runs(function() {
      expect(testComplete).toBeTruthy();
      self.Tapedeck.Backend.TemplateManager.setPackage("default");
    });
  });

});
