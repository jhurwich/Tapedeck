describe("Options Manager", function() {

  beforeEach(function() {
    this.optionsMgr = this.Tapedeck.Backend.OptionsManager;

    this.testOptions = {
      "Logs: 0=None, 1=Basic, 2=All": {
        "Frontend" : {
          "Messenger"       : 1
        },

        "Backend" : {
          "Initialization"  : 1,
          "MessageHandler"  : 1,
          "TemplateManager" : 1,
          "CassetteManager" : 1,
          "Bank"            : 1,
          "Sandbox"         : 1
        },

        "Scripts" : {
          "TrackParser"     : 1
        }
      },

      "Premade Cassettes": {
        "PremadeCassettified1" : "speccassettifiedpatttern/$#"
      },

      "Development": {

        "Skinning" : {
          "Template in src/dev": "spectemplate.html",
          "CSS in src/dev": "speccss.css"
        },

        "Cassettes" : {
          "Cassettes in src/dev": ["speccassette.js"]
        }
      }
    };

    this.waitsForBackendInit();
  });

  // A conf file entry for each attribute must exist to be tested
  it("should default to conf settings", function() {
    var self = this;
    var testComplete = false;
    var logsChecked = false;
    var premadesChecked = false;
    var templatesChecked = false;
    var cssChecked = false;
    var devCassettesChecked = false;

    var handleConf = function(unusedCallback, conf) {
      var optionsFromConf = $.parseJSON(conf);

      // remove all _comment's from the conf
      var commentDelete = function(object) {
        $.each(object, function(key, value) {
          if(typeof(value) == "object" ) {
            commentDelete(value);
          }
          else if (value == "_comment") {
            delete object[key];
          }
        });
        delete object._comment;
      };
      commentDelete(optionsFromConf);

      // get the options that reflect the real state
      var recovered = self.recoverOptions();

      // compare the real state to the conf
      for (var topParam in optionsFromConf) {
        if (topParam.indexOf("Logs") != -1) {
          expect(optionsFromConf[topParam]).toEqual(recovered.logs);
          logsChecked = true;

        }
        else if (topParam.indexOf("Premade Cassettes") != -1) {
          var premadesObject = optionsFromConf[topParam];
          var patterns = _.map(premadesObject, function(value, key) {
            return value;
          });
          patterns = patterns.sort();
          for (var i = 0; i < patterns.length; i++) {
            if (patterns[i] === "") {
              patterns.splice(i, 1);
              i--;
            }
          }
          expect(patterns).toEqual(recovered.premadeCassettes.sort());
          premadesChecked = true;

        }
        else if (topParam.indexOf("Development") != -1) {

          var devObject = optionsFromConf[topParam];
          for (var devParam in devObject) {

            if (devParam.indexOf("Skinning") != -1) {
              var skinObject = devObject[devParam];
              for (var skinParam in skinObject) {
                if (skinParam.indexOf("Template") != -1) {

                  // conf file entry changes must exist to be tested
                  if (skinObject[skinParam] !== "") {
                    var lastSlash = recovered.devTemplates.url.lastIndexOf("/");
                    var templateURL = recovered.devTemplates.url.substring(lastSlash + 1);
                    expect(skinObject[skinParam]).toEqual(templateURL);
                  }
                  templatesChecked = true;

                }
                else if (skinParam.indexOf("CSS") != -1) {

                  // conf file entry changes must exist to be tested
                  if (skinObject[skinParam] !== "") {
                    var lastSlash = recovered.devCSS.url.lastIndexOf("/");
                    var cssURL = recovered.devCSS.url.substring(lastSlash + 1);
                    expect(skinObject[skinParam]).toEqual(cssURL);
                  }
                  cssChecked = true;
                }
              }

            }
            else if (devParam.indexOf("Cassettes") != -1) {
              var cassetteObject = devObject[devParam];
              for (var cassetteParam in cassetteObject) {
                if (cassetteParam.indexOf("Cassette") != -1) {
                  expect(cassetteObject[cassetteParam].sort()).toEqual(recovered.devCassettes.sort());
                  devCassettesChecked = true;
                }
              }
            }
          }
        }
      }
      testComplete = logsChecked &&
                     premadesChecked &&
                     templatesChecked &&
                     cssChecked &&
                     devCassettesChecked;

      //got the conf file's options, compare to what's actually set
    };

    // curry null to fill the unusedCallback param
    self.optionsMgr.getConf(handleConf.curry(null));
    waitsFor(function() { return testComplete; }, "Waiting for Conf file", 2000);
  });

  it("should override conf settings from the options page", function() {
    var self = this;
    var testComplete = false;

    runs(function() {
      self.Tapedeck.Frontend.Messenger.saveOptions(self.testOptions, function() {
        var recovered = self.recoverOptions();
        for (var param in recovered) {
          var value = recovered[param];
          switch(param) {
          case "devTemplates":
            var expectedTemplate = self.testOptions.Development.Skinning["Template in src/dev"];
            var recoveredFilename = value.url.substring(value.url.lastIndexOf("/") + 1);
            expect(recoveredFilename).toEqual(expectedTemplate);
            break;

          case "devCSS":
            var expectedCSS = self.testOptions.Development.Skinning["CSS in src/dev"];
            var recoveredFilename = value.url.substring(value.url.lastIndexOf("/") + 1);
            expect(recoveredFilename).toEqual(expectedCSS);
            break;

          case "devCassettes":
            var expectedCassettes = self.testOptions.Development.Cassettes["Cassettes in src/dev"];
            expect(value).toEqual(expectedCassettes);
            break;

          case "premadeCassettes":
            var expectedPremade = [];
            expectedPremade.push(self.testOptions["Premade Cassettes"].PremadeCassettified1);
            expect(value).toEqual(expectedPremade);
            break;

          case "logs":
            var expectedLogs = self.testOptions["Logs: 0=None, 1=Basic, 2=All"];
            expect(value).toEqual(expectedLogs);
            break;

          default:
            expect("Unknown param in options recovered").toEqual("");
            break;
          }
        }
        testComplete = true;
      });
    });
    waitsFor(function() { return testComplete; }, "Waiting for Options to update", 2000);
  });
});
