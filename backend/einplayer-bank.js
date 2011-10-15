Einplayer.Backend.Bank = {

  tracks: { },
  drawerOpen: false,
  localStorage: null,

  bankPrefix: "_einplayerbank_",
  trackListPrefix: /* bankPrefix + */ "trackList-",
  playlistPrefix: /* trackListPrefix + */ "playlist-",
  init: function() {
    this.localStorage = window.localStorage;
    this.trackListPrefix = this.bankPrefix + this.trackListPrefix;
    this.playlistPrefix = this.trackListPrefix + this.playlistPrefix;
    
  },

  clear: function() {
    this.playlistList.reset();
    this.localStorage.clear();
  },

  findKeys: function(pattern) {
    var found = [];
    var regex = new RegExp(pattern, '');
    for (var i = 0; i < this.localStorage.length; i++) {
      var key = this.localStorage.key(i);
      if (key.match(regex)) {
        found.push(key);
      }
    }
    return found;
  },

  playlistList: null,
  savePlaylist: function(playlist) {
    var playlistList = this.getPlaylists();
    var found = playlistList.get(playlist.id); 
    if (found != null) {
      console.log("name collision!");
      this.removePlaylist(found);
    }
    playlistList.add(playlist);
  },

  removePlaylist: function(playlist) {
    var playlistList = this.getPlaylists();
    playlistList.remove(playlist);
  },

  getPlaylists: function() {
    if (this.playlistList == null) {
      this.playlistList = new Einplayer.Backend.Collections.PlaylistList();

      var playlistKeys = this.findKeys("^" + this.playlistPrefix + ".*");
      for (var i = 0; i < playlistKeys.length; i++) {
        var key = playlistKeys[i];
        var playlist = Einplayer.Backend.Bank.recoverList(key);
        this.playlistList.add(playlist);
      }
      
      this.playlistList.bind("add", this.addToPlaylistList);
      this.playlistList.bind("remove", this.removeFromPlaylistList);
    }
    return this.playlistList;
  },

  addToPlaylistList: function(playlist) {
    var key = Einplayer.Backend.Bank.playlistPrefix + playlist.id;
    var listStr = playlist.serialize();

    try {
      Einplayer.Backend.Bank.localStorage.setItem(key, listStr);
    }
    catch (error) {
      console.error("Could not save playlist '" + playlist.id + "'");
    }
    Einplayer.Backend.Bank.updatePlaylistListView();
  },

  removeFromPlaylistList: function(playlist) {
    var key = Einplayer.Backend.Bank.playlistPrefix + playlist.id;

    try { 
      Einplayer.Backend.Bank.localStorage.removeItem(key);
    }
    catch (error) {
      console.error("Could not remove playlist '" + playlist.id + "'");
    }
    Einplayer.Backend.Bank.updatePlaylistListView();
  },

  updatePlaylistListView: function() {
    var playlistList = Einplayer.Backend.Bank.getPlaylists();
    var listView = Einplayer.Backend
                            .TemplateManager
                            .renderView
                            ("PlaylistList",
                             { playlistList : playlistList });

    Einplayer.Backend.MessageHandler.pushView("playlist-list",
                                              listView);
  },
  
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
    return this.recoverList(key);
  },

  recoverList: function(key) {
    var tracksJSON = { };
    try {
      var listStr = this.localStorage.getItem(key);
      tracksJSON = $.parseJSON(listStr);
    }
    catch (error) {
      console.error("Could not recover trackList '" + name + "'");
    }
    
    var list;
    if (key.match(new RegExp("^" + this.playlistPrefix))) {
      list = new Einplayer.Backend.Collections.Playlist(tracksJSON);
      list.id = key.replace(this.playlistPrefix, "");
    }
    else {
      list = new Einplayer.Backend.Collections.TrackList(tracksJSON);
    }
    
    list.removeTempProperties();
    return list;
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
