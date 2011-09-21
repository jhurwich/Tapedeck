Einplayer.Backend.Bank = {

  tracks: { },

  
  saveTrack: function(trackModel) {
    Einplayer.Backend.Bank.tracks[trackModel.id] = trackModel;
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
}
