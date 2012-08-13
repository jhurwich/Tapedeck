Tapedeck.Backend.Collections.SavedTrackList =
  Tapedeck.Backend.Collections.TrackList.extend({

  getPrefix: function() {
    return Tapedeck.Backend.Bank.trackListPrefix;
  },

  initialize: function(models, options) {
    if (typeof(options) == "undefined" || !options) {
      options = {};
    }
    if ("id" in options) {
      this.id = options.id;
    }
    else {
      console.error(">>>>>>>>>>>>>>>>>>>>>>>>> no SavedTrackList name");
    }

    this.dirty = true;

    this.unbind("all");
    this.bind("all", Tapedeck.Backend.Collections.SavedTrackList.prototype.save);
  },

  save: function(eventName) {
    var bank = Tapedeck.Backend.Bank;
    if (typeof(eventName) != "undefined" && eventName.indexOf("change:") != -1) {
      return;
    }

    try {
      var key = this.getPrefix() + this.id;
      var listStr = this.serialize()[0];

      bank.localStorage.setItem(key, listStr);
      bank.Memory.rememberTrackList(key, this);

      this.dirty = true;
      if (bank.isSyncOn()) {
        bank.sync();
      }
    }
    catch (error) {
      console.error("Could not save playlist '" + this.id + "'");
    }
  },
});
