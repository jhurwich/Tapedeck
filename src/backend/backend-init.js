// App object for Tapedeck
if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
  Tapedeck.Backend = { };
}

Tapedeck.Backend.Models = { };
Tapedeck.Backend.Cassettes = { };
Tapedeck.Backend.Collections = { };
Tapedeck.Backend.Views = { };
Tapedeck.Backend.Controllers = { };
Tapedeck.Backend.init = function() {
  var log = function(str, level) {
    Tapedeck.Backend.Utils.log("Initialization", str, level);
  };

  if (typeof(chrome.extension) == 'undefined') {
    // we beat the extension APIs to loading, defer for a moment
    log("<( Defering Initialization )>");
    setTimeout(Tapedeck.Backend.init, 500);
    return;
  }
  log("<( Initialization begun )>");

  Tapedeck.Backend.MessageHandler.init(); // other inits, like CassetteMgr, need MsgHandler
  log("MessageHandler initialized.  Next is Bank...");

  Tapedeck.Backend.Bank.init(function() { // other inits, like OptionsMgr, need Bank
    log("Bank initialized.  Next is OptionsManager...");

    Tapedeck.Backend.OptionsManager.init(function() {
      log("OptionsManager initialized. Next is CassetteManager...");

      Tapedeck.Backend.CassetteManager.init(function() {
        log("CassetteManager initialized. Next is TemplateManager...");

        Tapedeck.Backend.TemplateManager.init(function() {
          log("TemplateManager initialized.  Next is InjectManager...");

          Tapedeck.Backend.InjectManager.init();
          log("InjectManager initialized.  Next is Sequencer...");

          Tapedeck.Backend.Sequencer.init();
          log("Sequencer initialized.  Complete init.");

          log("<( Initialization complete )>");
        });
      });
    });
  });


};

$(function() {
  Tapedeck.Backend.init();
});
