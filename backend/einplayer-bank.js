Einplayer.Backend.Bank = {

  tracks: { },
  drawerOpen: false,
  localStorage: null,

  init: function() {
    this.localStorage = window.localStorage;
  },

  bankPrefix: "_einplayerbank_",
  trackListPrefix: this.bankPrefix + "trackList-",
  saveTrackList: function(name, trackList) {
    var key = this.trackListPrefix + name;
    var listStr = trackList.serialize();
    
    try { 
      this.localStorage.setItem(key, listStr);
    }
    catch (error) {
      console.error("Could not save trackList '" + name + "'");
    }
  },

  getTrackList: function(name) {
    var key = this.trackListPrefix + name;
    var tracksJSON = { };
    try {
      var listStr = this.localStorage.getItem(key);
      tracksJSON = $.parseJSON(listStr);
    }
    catch (error) {
      console.error("Could not recover trackList '" + name + "'");
    }
    
    var trackList = new Einplayer.Backend.Collections.TrackList(tracksJSON);
    trackList.removeTempProperties();
    return trackList;
  },
  
  saveTrack: function(trackModel) {
    Einplayer.Backend.Bank.tracks[trackModel.get("einID")] = trackModel;
  },

  saveTracks: function(trackCollection) {
    for (var i = 0; i < trackCollection.length; i++) {
      var trackModel = trackCollection.at(i);
      this.saveTrack(trackModel);
    }
  },

  getTrack: function(trackID) {
    return Einplayer.Backend.Bank.tracks[trackID];
  },

  setDrawerOpened: function(open) {
    Einplayer.Backend.Bank.drawerOpen = open;
  },
  
  getDrawerOpened: function() {
    return Einplayer.Backend.Bank.drawerOpen;
  },
}
