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
                  expect(skinObject[skinParam]).toEqual(recovered.devTemplates);
                  templatesChecked = true;
                }
                else if (skinParam.indexOf("CSS") != -1) {
                  expect(skinObject[skinParam]).toEqual(recovered.devCSS);
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
      console.log("saving options");
      self.Tapedeck.Frontend.Messenger.saveOptions(self.testOptions, function() {
        var recovered = self.recoverOptions();
        console.log(JSON.stringify(recovered));
        for (var param in recovered) {
          var value = recovered[param];
          switch(param)
          {
            case "devTemplates":
              var expectedTemplate = self.testOptions.Development.Skinning["Template in src/dev"];
              expect(value).toEqual(expectedTemplate);
              break;

            case "devCSS":
              var expectedCSS = self.testOptions.Development.Skinning["CSS in src/dev"];
              expect(value).toEqual(expectedCSS);
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
