// App object for Einplayer
if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Backend = { };
}

Einplayer.Backend.Models = { };
Einplayer.Backend.Cassettes = { };
Einplayer.Backend.Collections = { };
Einplayer.Backend.Views = { };
Einplayer.Backend.Controllers = { };
Einplayer.Backend.init = function() {
  Einplayer.Backend.CassetteManager.init();
  Einplayer.Backend.TemplateManager.init();
  Einplayer.Backend.MessageHandler.init();
};
