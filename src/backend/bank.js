Tapedeck.Backend.Bank = {

  tracks: { },
  drawerOpen: false,
  localStorage: null,

  
  defaultBlockPatterns : [ "chrome://",
                           "chrome-devtools://",
                           "mail",
                           "maps.google.com" ],

  bankPrefix: "_tapedeckbank_",
  trackListPrefix: /* bankPrefix + */ "trackList-",
  playlistPrefix: /* trackListPrefix + */ "playlist-",
  repeatKey: /* bankPrefix + */ "repeat",
  volumeKey: /* bankPrefix + */ "volume",
  blockKey: /* bankPrefix + */ "block",
  init: function() {
    this.localStorage = window.localStorage;
    
    this.trackListPrefix = this.bankPrefix + this.trackListPrefix;
    this.playlistPrefix = this.trackListPrefix + this.playlistPrefix;
    this.repeatKey = this.bankPrefix + this.repeatKey;
    this.blockKey = this.bankPrefix + this.blockKey;
    if (this.localStorage.getItem(this.repeatKey) == null) {
      this.localStorage.setItem(this.repeatKey, "true");
    }
    // initialize the block list if necessary
    if (this.localStorage.getItem(this.blockKey) == null) {
      this.saveBlockList(this.defaultBlockPatterns);
    }
    
    this.FileSystem.init();
  },

  // We expect this to be the most commonly used function so it is
  // memoized.
  blockList : null,
  getBlockList : function() {
    var bank = Tapedeck.Backend.Bank;

    // Load the blocklist if we have not already
    if (bank.blockList == null) {
      var blockStr = bank.getBlockListStr();
      bank.blockList = JSON.parse(blockStr);
    }
    return bank.blockList;
  },
  saveBlockList: function(blockArr) {
    var bank = Tapedeck.Backend.Bank;

    // sort and remove duplicates
    blockArr.sort();
    for (var i = 0; i < blockArr.length - 1;  i++) {
      if (blockArr[i] == blockArr[i + 1]) {
        blockArr.splice(i + 1, 1);
        i--;
      }
    }
    bank.blockList = blockArr;
    bank.localStorage.setItem(bank.blockKey,
                              JSON.stringify(bank.blockList));
  },
  getBlockListStr: function() {
    var bank = Tapedeck.Backend.Bank;
    var blockStr = bank.localStorage.getItem(bank.blockKey);

    return blockStr;
  },
  saveBlockListStr: function(blockListStr) {
    var bank = Tapedeck.Backend.Bank;
    bank.saveBlockList(JSON.parse(blockListStr));
  },

  FileSystem : {
    root : null,
    fileSystemSize: 100, // in MB
    init: function() {
      window.requestFileSystem  = window.requestFileSystem ||
                                  window.webkitRequestFileSystem;

      var successCallback = function(e) {
        Tapedeck.Backend.Bank.FileSystem.root = e.root;
      };
        
      window.requestFileSystem(window.TEMPORARY,
                               this.fileSystemSize*1024*1024, // specified in MB
                               successCallback,
                               this.errorHandler)
    },

    download: function(trackID, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      var track = Tapedeck.Backend.Bank.getTrack(trackID);
      var url = track.get("url");

      // Mark the track as downloading to get the proper indicators.
      // We have a handle on one that lives (or lived) in the browse
      // list, but we need to see if there's one in the queue that needs
      // to be indicated as well.
      track.set({ download: "downloading" });
      var queued = Tapedeck.Backend.Sequencer.getQueuedTrack(trackID);
      if (queued != null) {
        queued.set({ download: "downloading" });
      }

      // Get the file data from the url
      var xhr = new XMLHttpRequest();
      xhr.overrideMimeType("audio/mpeg");
      xhr.open("GET", url, true);
      
      xhr.responseType = "arraybuffer";
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4 && xhr.status == 200)  {
          fs.saveResponse(track, xhr.response, callback);    
          delete xhr;
        }
      } // end xhr.onreadystatechange
      
      xhr.send();
    }, // end fs.download()

    saveResponse: function(track, res, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      // Fill a Blob with the response
      var bb = new (window.BlobBuilder || window.WebKitBlobBuilder)();
      if (!res) {
        return;
      }
      var byteArray = new Uint8Array(res);
      bb.append(byteArray.buffer);
  
      // Create a new file for the track
      var fileName = fs.nameFile(track);
      fs.root.getFile(fileName, {create: true}, function(fileEntry) {

        // Create a FileWriter object for our FileEntry 
        fileEntry.createWriter(function(fileWriter) {
  
          // once the file is written, send it's location to the caller
          fileWriter.onwriteend = function(e) {
            callback(fileEntry.toURL());
            track.unset("download");
            var queued = Tapedeck.Backend.Sequencer.getQueuedTrack
                                                   (track.get("tdID"));
            if (queued != null) {
              queued.unset("download");
            }
          };
          fileWriter.onerror = function(e) {
            console.error('Saving file to disk failed: ' + e.toString());
          };
    
          // Write the blob to the file
          fileWriter.write(bb.getBlob("audio/mpeg"));
          delete bb; 
        }, fs.errorHandler); // end fileEntry.createWrite(...)
      }, fs.errorHandler); // end fs.root.getFile(...);
    },

    removeTrack: function(trackID) {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      var track = Tapedeck.Backend.Bank.getTrack(trackID);

      var fileName = fs.nameFile(track);
      fs.root.getFile(fileName, {create: false}, function(fileEntry) {

        fileEntry.remove(function() {
          // File removed
        }, fs.errorHandler);
        
      }, fs.errorHandler);
    },

    clear: function() {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      var dirReader = fs.root.createReader();
      dirReader.readEntries(function(entries) {
        for (var i = 0, entry; entry = entries[i]; ++i) {
          if (entry.isDirectory) {
            entry.removeRecursively(function() {}, fs.errorHandler);
          } else {
            entry.remove(function() {}, fs.errorHandler);
          }
        }
      }, fs.errorHandler);
    },

    nameFile: function(track) {
      var trim = function(string) {
        return string.replace(/^\s+|\s+$/g, '');
      }
      
      // Attempt to name the file as "<artistName> - <trackName>"
      var fileName = "";
      if (track.has("trackName")) {
        if (track.has("artistName")) {
          fileName += trim(track.get("artistName")) + " - ";
        }
        fileName += trim(track.get("trackName"));
      }
      
      // If we couldn't do that, gotta use the url
      if (fileName.length == 0) {
        var urlName = url.replace("http://", "");
        urlName = urlName.replace("www.", "");

        // We pull off the file extension, if there is one.
        // We consider it a file extension if there are 4 or less
        // characters after the final dot.
        var extensionDot = urlName.indexOf(".", urlName.length - 5);
        if (extensionDot > 0,
            extensionDot = urlName.lastIndexOf(".")) {
          urlName = urlName.substring(0, extensionDot);
        }
        fileName = urlName;
      }
      
      fileName = trim(fileName);
      
      // I would add the file extension here, but if you do chrome will
      // try to play the mp3 rather than download.  So no extension for you!
      
      return fileName;
    },

    // Generic error dump for any filesystem errors
    errorHandler: function(e) {
      var msg = '';
    
      switch (e.code) {
        case FileError.NOT_FOUND_ERR:
          msg = 'NOT_FOUND_ERR';
          break;
        case FileError.SECURITY_ERR:
          msg = 'SECURITY_ERR';
          break;
        case FileError.ABORT_ERR:
          msg = 'ABORT_ERR';
          break;
        case FileError.NOT_READABLE_ERR:
          msg = 'NOT_READABLE_ERR';
          break;
        case FileError.ENCODING_ERR:
          msg = 'ENCODING_ERR';
          break;
        case FileError.NO_MODIFICATION_ALLOWED_ERR:
          msg = 'NO_MODIFICATION_ALLOWED_ERR';
          break;
        case FileError.INVALID_STATE_ERR:
          msg = 'INVALID_STATE_ERR';
          break;
        case FileError.SYNTAX_ERR:
          msg = 'SYNTAX_ERR';
          break;
        case FileError.INVALID_MODIFICATION_ERR:
          msg = 'INVALID_MODIFICATION_ERR';
          break;
        case FileError.QUOTA_EXCEEDED_ERR:
          msg = 'QUOTA_EXCEEDED_ERR';
          break;
        case FileError.TYPE_MISMATCH_ERR:
          msg = 'TYPE_MISMATCH_ERR';
          break;
        case FileError.PATH_EXISTS_ERR:
          msg = 'PATH_EXISTS_ERR';
          break;
        default:
          msg = 'Unknown Error';
          break;
      };
      console.error('File System Error: ' + msg);
    },
  },

  clear: function() {
    this.playlistList.reset();
    this.localStorage.clear();
    this.FileSystem.clear();
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
      this.playlistList = new Tapedeck.Backend.Collections.PlaylistList();

      var playlistKeys = this.findKeys("^" + this.playlistPrefix + ".*");
      for (var i = 0; i < playlistKeys.length; i++) {
        var key = playlistKeys[i];
        var playlist = Tapedeck.Backend.Bank.recoverList(key);
        this.playlistList.add(playlist);
      }
      
      this.playlistList.bind("add", this.addToPlaylistList);
      this.playlistList.bind("remove", this.removeFromPlaylistList);
    }
    return this.playlistList;
  },

  addToPlaylistList: function(playlist) {
    var key = Tapedeck.Backend.Bank.playlistPrefix + playlist.id;
    var listStr = playlist.serialize();

    try {
      Tapedeck.Backend.Bank.localStorage.setItem(key, listStr);
    }
    catch (error) {
      console.error("Could not save playlist '" + playlist.id + "'");
    }
    Tapedeck.Backend.Bank.updatePlaylistListView();
  },

  removeFromPlaylistList: function(playlist) {
    var key = Tapedeck.Backend.Bank.playlistPrefix + playlist.id;

    try { 
      Tapedeck.Backend.Bank.localStorage.removeItem(key);
    }
    catch (error) {
      console.error("Could not remove playlist '" + playlist.id + "'");
    }
    Tapedeck.Backend.Bank.updatePlaylistListView();
  },

  updatePlaylistListView: function() {
    var playlistList = Tapedeck.Backend.Bank.getPlaylists();
    var listView = Tapedeck.Backend
                           .TemplateManager
                           .renderView
                           ("PlaylistList",
                            { playlistList : playlistList });

    Tapedeck.Backend.MessageHandler.pushView("playlist-list",
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
      list = new Tapedeck.Backend.Collections.Playlist(tracksJSON);
      list.id = key.replace(this.playlistPrefix, "");
    }
    else {
      list = new Tapedeck.Backend.Collections.TrackList(tracksJSON);
    }
    
    list.removeTempProperties();
    return list;
  },
  
  saveTrack: function(trackModel) {
    Tapedeck.Backend.Bank.tracks[trackModel.get("tdID")] = trackModel;
  },

  saveTracks: function(trackCollection) {
    for (var i = 0; i < trackCollection.length; i++) {
      var trackModel = trackCollection.at(i);
      this.saveTrack(trackModel);
    }
  },

  getTrack: function(trackID) {
    return Tapedeck.Backend.Bank.tracks[trackID];
  },

  setDrawerOpened: function(open) {
    Tapedeck.Backend.Bank.drawerOpen = open;
  },
  
  getDrawerOpened: function() {
    return Tapedeck.Backend.Bank.drawerOpen;
  },

  toggleRepeat: function() {
    var oldVal = (this.localStorage.getItem(this.repeatKey) == "true");

    this.localStorage.setItem(this.repeatKey,
                              (oldVal ? "false" : "true"));
  },

  getRepeat: function() {
    return this.localStorage.getItem(this.repeatKey) == "true";
  },

  saveVolume: function(volume) {
    this.localStorage.setItem(this.volumeKey, volume);
  },

  getVolume: function() {
    var volume = this.localStorage.getItem(this.volumeKey);
    return ((volume != null) ? volume : 1);
  },
}
