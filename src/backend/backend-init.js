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
  if (typeof(chrome.extension) == 'undefined') {
    // we beat the extension APIs to loading, defer for a moment
    console.log("defering init");
    setTimeout(Tapedeck.Backend.init, 500);
    return;
  }
  Tapedeck.Backend.MessageHandler.init(); // other inits, like CassetteMgr, need MsgHandler
  Tapedeck.Backend.Bank.init(function() { // other inits, like OptionsMgr, need Bank
    Tapedeck.Backend.OptionsManager.init(function() {
      Tapedeck.Backend.CassetteManager.init(function() {
        Tapedeck.Backend.TemplateManager.init(function() {
          Tapedeck.Backend.InjectManager.init();
          Tapedeck.Backend.Sequencer.init();
        });
      });
    });
  });
};

$(function() {
  Tapedeck.Backend.init();
});
