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
  Tapedeck.Backend.Bank.init();
  Tapedeck.Backend.CassetteManager.init();
  Tapedeck.Backend.TemplateManager.init();
  Tapedeck.Backend.MessageHandler.init();
  Tapedeck.Backend.Sequencer.init();
};