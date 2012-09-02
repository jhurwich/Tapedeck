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

    console.log(">> I '" + this.id + "' now exist and am dirty");
    this.dirty = true;

    this.unbind("destroy");
    this.unbind("all");
    this.bind("destroy", Tapedeck.Backend.Collections.SavedTrackList.prototype.destroy);
    this.bind("all", Tapedeck.Backend.Collections.SavedTrackList.prototype.save);
  },

  save: function(eventName) {
    var bank = Tapedeck.Backend.Bank;

    // we ignore 'change:__' subevents, the 'destroy' event, and 'set position' which occurs on the queue
    if (typeof(eventName) != "undefined" && ((eventName.indexOf("change:") != -1) ||
                                             (eventName.indexOf("destroy") != -1) ||
                                             (eventName.indexOf("set position") != -1))) {
      return;
    }

    // make sure we don't re-save removed things
    if (typeof(this.removed) != "undefined" && this.removed) {
      console.log(this.id + " has been removed, we will not save it");
      return;
    }

    try {
      var key = this.getPrefix() + this.id;
      var listStr = this.serialize()[0];

      bank.localStorage.setItem(key, listStr);
      bank.Memory.rememberTrackList(key, this);

      this.dirty = true;
      console.log(">> I '" + this.id + "' am dirty again because of (" + eventName + ")");
      if (bank.isSyncOn()) {
        bank.sync();
      }
    }
    catch (error) {
      console.error("Could not save playlist '" + this.id + "' : " + JSON.stringify(error));
    }
  },

  destroy: function() {
    var bank = Tapedeck.Backend.Bank;

    this.removed = true;
    bank.clearList(this);
  },
});
