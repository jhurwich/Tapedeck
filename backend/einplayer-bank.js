Einplayer.Backend.Bank = {

  tracks: { },

  init: function() {

  },
  
  saveTrack: function(trackModel) {
    
    console.log("'" + trackModel.id + "' saving track: " + JSON.stringify(trackModel.toJSON()));
    Einplayer.Backend.Bank.tracks[trackModel.id] = trackModel;
  },

  saveTracks: function(trackCollection) {
    for (var i = 0; i < trackCollection.length; i++) {
      var trackModel = trackCollection.at(i);
      this.saveTrack(trackModel);
    }
  },

  getTrack: function(trackID) {
    console.log("getting for " + trackID);
    return Einplayer.Backend.Bank.tracks[trackID];
  },
}
