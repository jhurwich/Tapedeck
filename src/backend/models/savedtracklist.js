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
      console.error("no SavedTrackList name");
    }

    if ("save" in options) {
      this.ignoreFirstSave = !options.save; // we ignore the first  'add' event, if we just rebuilt the list (it's being added to PlaylistList)
    }
    this.dirty = false;

    this.unbind("destroy");
    this.unbind("all");
    this.bind("destroy", Tapedeck.Backend.Collections.SavedTrackList.prototype.destroy);
    this.bind("all", Tapedeck.Backend.Collections.SavedTrackList.prototype.save);

    // we don't need to add to localStorage etc. here, because an add event will come in triggering save
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
      return;
    }

    try {
      var key = this.getPrefix() + this.id;
      var listStr = this.serialize()[0];

      bank.localStorage.setItem(key, listStr);
      bank.Memory.rememberTrackList(key, this);

      if (typeof(this.ignoreFirstSave) != "undefined" && this.ignoreFirstSave) {
        // we ignore the first add for new playlists (not the queue, though)
        this.ignoreFirstSave = false;
      }
      else if (bank.isSyncOn()) {
        console.log(">> I '" + this.id + "' am dirty again because of (" + eventName + ") - was " + this.dirty);
        this.dirty = true;
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
