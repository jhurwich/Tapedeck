Tapedeck.Backend.Bank = {

  drawerOpen: false,
  localStorage: null,


  defaultBlockPatterns : [ "chrome://",
                           "chrome-devtools://",
                           "mail",
                           "maps.google.com" ],

  bankPrefix: "_tapedeckbank_",
  trackListPrefix: /* bankPrefix + */ "trackList-",
  playlistPrefix: /* trackListPrefix + */ "playlist-",
  splitListContinuePrefix: /* bankPrefix + */ "listContinue",
  currentCassetteKey: /* bankPrefix + */ "currentCassette",
  cassettePagePrefix: /* bankPrefix + */ "cassettePages",
  repeatKey: /* bankPrefix + */ "repeat",
  syncKey: /* bankPrefix + */ "sync",
  volumeKey: /* bankPrefix + */ "volume",
  blockKey: /* bankPrefix + */ "block",
  lastSyncWarningKey: /* bankPrefix + */ "lastSyncWarning",
  init: function(continueInit) {
    this.localStorage = window.localStorage;

    this.trackListPrefix = this.bankPrefix + this.trackListPrefix;
    this.playlistPrefix = this.trackListPrefix + this.playlistPrefix;
    this.splitListContinuePrefix = this.bankPrefix + this.splitListContinuePrefix;
    this.currentCassetteKey = this.bankPrefix + this.currentCassetteKey;
    this.cassettePagePrefix = this.bankPrefix + this.cassettePagePrefix;
    this.repeatKey = this.bankPrefix + this.repeatKey;
    this.syncKey = this.bankPrefix + this.syncKey;
    this.blockKey = this.bankPrefix + this.blockKey;
    this.lastSyncWarningKey = this.bankPrefix + this.lastSyncWarningKey;
    if (this.localStorage.getItem(this.repeatKey) == null) {
      this.localStorage.setItem(this.repeatKey, "true");
    }
    if (this.localStorage.getItem(this.syncKey) == null) {
      this.localStorage.setItem(this.syncKey, "off");
    }
    // initialize the block list if necessary
    if (this.localStorage.getItem(this.blockKey) == null) {
      this.saveBlockList(this.defaultBlockPatterns);
    }

    this.Memory.init();
    this.FileSystem.init(function() {
      Tapedeck.Backend.Bank.preparePlaylistList(function() {
        // Attach events to ensure the browseList is updated and saved properly.
        // Kind of wish there was a better place to do this.
        Tapedeck.Backend.Bank.getBrowseList(function(browseList) {
          browseList.bind("change tracks", function() {
            Tapedeck.Backend.MessageHandler.pushBrowseTrackList(this);
          })

          continueInit();
        });
      });
    });
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
    init: function(continueInit) {
      window.requestFileSystem  = window.requestFileSystem ||
                                  window.webkitRequestFileSystem;

      var successCallback = function(e) {
        Tapedeck.Backend.Bank.FileSystem.root = e.root;
        continueInit();
      };

      window.requestFileSystem(window.TEMPORARY,
                               this.fileSystemSize*1024*1024, // specified in MB
                               successCallback,
                               this.errorHandler.curry("requestFileSystem"));
    },

    saveCassette: function(code, name, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;

      fs.root.getDirectory('Cassettes', {create: true}, function(dirEntry) {
        dirEntry.getFile(name, {create: true}, function(fileEntry) {
          // Create a FileWriter object for our FileEntry
          fileEntry.createWriter(function(fileWriter) {

            fileWriter.onwriteend = function(e) {
              callback(true);
            };
            fileWriter.onerror = function(e) {
              callback(false);
            };

            var blob = new Blob([code], { 'type': 'text/plain' });
            fileWriter.write(blob);
          }, fs.errorHandler.curry("saveCassette3"));
        }, fs.errorHandler.curry("saveCassette2"));
      }, fs.errorHandler.curry("saveCassette1"));
    },

    removeCassette: function(name, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;

      fs.root.getDirectory('Cassettes', {create: true}, function(dirEntry) {
        dirEntry.getFile(name, {create: true}, function(fileEntry) {

          fileEntry.remove(function() {
            callback();
          }, fs.errorHandler.curry("removeCassette3"));

        }, fs.errorHandler.curry("removeCassette2"));
      }, fs.errorHandler.curry("removeCassette1"));

      var pageKey = Tapedeck.Backend.Bank.cassettePagePrefix + name;
      var page = Tapedeck.Backend.Bank.localStorage.removeItem(pageKey);
    },

  // Returns cassetteDatas of the form { name: "", contents: "", url: "" (, page: num) }
    getCassettes: function(aCallback) {
      var callback = function(datas) {
        for (var i = 0; i < datas.length; i++) {
          var name = datas[i].name;

          var pageKey = Tapedeck.Backend.Bank.cassettePagePrefix + name;
          var page = Tapedeck.Backend.Bank.localStorage.getItem(pageKey);

          if (page != null) {
            datas[i].page = page;
          }
        }
        aCallback(datas);
      };

      this.loadDir("Cassettes", callback)
    },

    // cssCode is optional
    saveTemplate: function(templateCode, cssCode, name, aCallback) {
      // if only 3 arguments then cssCode wasn't specified
      if (arguments.length == 3) {
        aCallback = name;
        name = cssCode;
        cssCode = null;
      }
      var fs = Tapedeck.Backend.Bank.FileSystem;

      // expect 2 callbacks if we are saving CSS as well, otherwise only 1
      var remainingCallbacks = 1;
      if (cssCode != null) {
        remainingCallbacks = remainingCallbacks + 1;
      }

      var combinedSuccess = true;
      var callback = function(success) {
        remainingCallbacks = remainingCallbacks - 1;
        combinedSuccess = combinedSuccess && success;

        if (remainingCallbacks <= 0) {
          aCallback(combinedSuccess);
        }
      };

      fs.saveCode("Templates", templateCode, name, callback);
      if (cssCode != null ) {
        fs.saveCode("CSS", cssCode, name, callback);
      }

    },

    // the contents of a template file should be an HTML doc with <script> templates
    // will return [{ name: "", contents: "", url: "" (, cssURL: "", cssContents: "") }]
    getTemplates: function(aCallback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;

      var callback = function(templateDatas, cssDatas) {
        var cssMap = { };
        for (var i = 0; i < cssDatas.length; i++) {
          cssMap[cssDatas[i].name] = cssDatas[i];
        }

        var datas = templateDatas;
        for (var i = 0; i < datas.length; i++) {
          var data = datas[i];
          if (data.name in cssMap) {
            data.cssURL = cssMap[data.name].url;
            data.cssContents = cssMap[data.name].contents;
          }
        }

        aCallback(datas);
      }

      fs.loadDir("Templates", function(aTemplateDatas) {
        fs.loadDir("CSS", function(aCSSDatas) {
          callback(aTemplateDatas, aCSSDatas);
        })
      });
    },

    saveCode: function(dir, code, name, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;

      fs.root.getDirectory(dir, {create: true}, function(dirEntry) {
        dirEntry.getFile(name, {create: true}, function(fileEntry) {
          // Create a FileWriter object for our FileEntry
          fileEntry.createWriter(function(fileWriter) {

            fileWriter.onwriteend = function(e) {
              callback(true);
            };
            fileWriter.onerror = function(e) {
              callback(false);
            };

            var blob = new Blob([code], { type:'text/plain' });
            fileWriter.write(blob);
          }, fs.errorHandler.curry("saveCode3"));
        }, fs.errorHandler.curry("saveCode2"));
      }, fs.errorHandler.curry("saveCode1"));
    },

    // returns an array of { name: __, contents:<string_contents>, url:<fs_url> }
    loadDir: function(dir, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      var datas = [];

      fs.root.getDirectory(dir, {create: true}, function(dirEntry) {

        /* We check for metadata to know if there are any entries.
         * This call will error if the directory is new/empty so we can
         * callback properly */
        dirEntry.getMetadata(function(metadata) {
          // got metadata, there must be entries
          var dirReader = dirEntry.createReader();
          dirReader.readEntries(function(entries) {
            var numReads = entries.length;
            if (numReads == 0) {
              callback(datas);
              return;
            }

            for (var i = 0; i < entries.length; i++) {
              var entry = entries[i];

              var scoped = function(currEntry) {
                var name = currEntry.name;
                if (!currEntry.isFile) {
                  numReads--;
                  if (numReads == 0) {
                    callback(datas);
                  }
                  return;
                }

                currEntry.file(function(file) {
                  var reader = new FileReader();
                  reader.onloadend = function(e) {
                    numReads--;
                    var data = { name: name,
                                 contents: this.result,
                                 url : currEntry.toURL() };

                    datas.push(data);

                    if (numReads == 0) {
                      callback(datas);
                    }
                  };

                  reader.readAsText(file);
                });
              }(entry);
            }

          });
        }, function(error) {
          // no metadata available, must be empty directory
          callback([]);
        });

      }, fs.errorHandler.curry("loadDir1"));
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
      if (!res) {
        return;
      }
      var byteArray = new Uint8Array(res);
      var blob = new Blob([byteArray], { type: 'audio/mpeg' });

      // Create a new file for the track
      var fileName = fs.nameFile(track);
      fs.root.getFile(fileName, {create: true}, function(fileEntry) {

        // Create a FileWriter object for our FileEntry
        fileEntry.createWriter(function(fileWriter) {
          // once the file is written, send it's location to the caller
          fileWriter.onwriteend = function(e) {
            callback({ url: fileEntry.toURL(), fileName: fileName });
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
          fileWriter.write(blob);
          delete blob;
        }, fs.errorHandler.curry("saveResponse2")); // end fileEntry.createWrite(...)
      }, fs.errorHandler.curry("saveResponse1")); // end fs.root.getFile(...);
    },

    removeTrack: function(trackID) {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      var track = Tapedeck.Backend.Bank.getTrack(trackID);

      var fileName = fs.nameFile(track);
      fs.root.getFile(fileName, {create: false}, function(fileEntry) {

        fileEntry.remove(function() {
          // File removed
        }, fs.errorHandler.curry("removeTrack2"));

      }, fs.errorHandler.curry("removeTrack1"));
    },

    clear: function() {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      var dirReader = fs.root.createReader();
      dirReader.readEntries(function(entries) {
        for (var i = 0, entry; entry = entries[i]; ++i) {
          if (entry.isDirectory) {
            entry.removeRecursively(function() {}, fs.errorHandler.curry("clear2A"));
          } else {
            entry.remove(function() {}, fs.errorHandler.curry("clear2B"));
          }
        }
      }, fs.errorHandler.curry("clear1"));

      // a bank clear invalidates the packages in the template manager
      Tapedeck.Backend.TemplateManager.packages = { };
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
    errorHandler: function(functionName, e) {
      if (typeof(functionName) != "string") {
        e = functionName;
        functionName = "unknown location"
      }
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
      console.error('File System Error in "' + functionName + '": ' + msg);
    },
  },

  Memory: {
    tracks: { },
    /* tracksData = { tracks: _, expiry: _ } */

    init: function() {},

    tracks: { },
    trackLists: { },

    rememberTrackList: function(name, trackList) {
      var bank = Tapedeck.Backend.Bank
      this.trackLists[name] = trackList;

      var trackListChanged = function(eventName) {
        bank.saveList(bank.trackListPrefix, name, trackList, function() { });
      }
      trackList.bind("all", trackListChanged);
    },

    getTrackList: function(name) {
      if (typeof(this.trackLists[name]) != undefined) {
        return this.trackLists[name];
      }
      else {
        return null;
      }
    },

    getTrack: function(trackID) {
      for (var listName in this.trackLists) {
        var list = this.trackLists[listName];
        var found = list.select(function(tr) {
          return tr.get("tdID") == trackID;
        });

        if (found.length == 1) {
          return found[0];
        }
      }
      return null;
    },

    clearList: function(name) {
      delete this.trackLists[name];
    },
  },

  getTrack: function(trackID) {
    var bank = Tapedeck.Backend.Bank;
    return bank.Memory.getTrack(trackID);
  },

  clear: function() {
    if (typeof(this.playlistList) != "undefined" &&
        this.playlistList != null) {
      this.playlistList.reset();
    }
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
      console.error("PlaylistList is not ready.")
    }
    return this.playlistList;
  },

  preparePlaylistList: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    bank.playlistList = new Tapedeck.Backend.Collections.PlaylistList();

    if (bank.isSyncOn()) {
      // Sync is active, get everything that's in storage
      chrome.storage.sync.get(null, function(allStored) {

        // select only those that represent playlists
        var playlistKeys = [];
        for (var key in allStored) {
          if(key.match(new RegExp("^" + bank.playlistPrefix)) != null ||
             key.match(new RegExp("^" + bank.splitListContinuePrefix)) != null) {
            // key represents a playlist (or piece of one)
            playlistKeys.push(key);
          }
        }

        // now query storage for all the playlists represented and rebuild them
        chrome.storage.sync.get(playlistKeys, function(playlistsObject) {
          for (var playlistKey in playlistsObject) {
            if (playlistKey.match(new RegExp("^" + bank.playlistPrefix)) == null) {
              // this doesn't represent the start of a playlist
              continue;
            }

            // build the start of this new playlist
            var playlistID = playlistKey.replace(bank.playlistPrefix, "");
            var playlistData = null;
            try {
              playlistData = $.parseJSON(playlistsObject[playlistKey]);
            }
            catch (error) {
              console.error("Could not recover playlist '" + playlistID + "'");
              continue;
            }

            // we need to see if there are any other pieces to this playlist
            var nextCount = 0;
            var nextKey = bank.splitListContinuePrefix + playlistID + "@" + nextCount;
            while(nextKey in playlistsObject) {
              var nextData = null;
              try {
                nextData = $.parseJSON(playlistsObject[nextKey]);
              }
              catch (error) {
                console.error("Could not recover the " + (nextCount + 1) + " piece of playlist '" + playlistID + "'");
                break;
              }

              // if we find a new piece, add it to the playlist
              playlistData = playlistData.concat(nextData);
              nextCount++;
              var nextKey = bank.splitListContinuePrefix + playlistID + "@" + nextCount;
            }

            // turn the playlistData into a real playlist
            var playlist = new Tapedeck.Backend.Collections.Playlist(playlistData);
            playlist.id = playlistID;
            bank.playlistList.add(playlist);
          } // end for (playlistKey in playlistsObject)

          bank.playlistList.bind("add", bank.addToPlaylistList);
          bank.playlistList.bind("remove", bank.removeFromPlaylistList);

          bank.checkQuota();
          callback();
        }) // end chrome.storage.sync.get(playlistKeys...
      });
    }
    else {
      // Local mode
      var playlistKeys = bank.findKeys("^" + bank.playlistPrefix + ".*");
      for (var i = 0; i < playlistKeys.length; i++) {
        var key = playlistKeys[i];
        var playlist = Tapedeck.Backend.Bank.recoverLocalList(key);
        bank.playlistList.add(playlist);
      }
      bank.playlistList.bind("add", bank.addToPlaylistList);
      bank.playlistList.bind("remove", bank.removeFromPlaylistList);
      callback();
    }
  },

  /* 2048 bytes is actual limit, ~30 bytes of overhead seems common so ~100 bytes of headroom */
  MAX_SYNC_STRING_SIZE: 1900,
  MAX_NUMBER_SPLITS: 25,
  saveList: function(prefix, id, list, callback) {
    var bank = Tapedeck.Backend.Bank;
    // first determine if we are saving locally or to the cloud.

    if (bank.isSyncOn()) {
      // we may have to split the list up, attempt to split into up to 25 pieces
      var attemptSave = function(numSerialize) {
        if (typeof(numSerialize) == "undefined") {
          numSerialize = 1;
        }
        if (numSerialize > bank.MAX_NUMBER_SPLITS) {
          // Don't do splits this large, just give up
          console.error("Won't split playlist into " + numSerialize + " parts for saving.  Playlist is too large.")

          //TODO handle this case
        }

        // return numSerialize number of strings to save for this one playlist
        var savedKeys = [];
        var serialized = list.serialize(numSerialize);

        // loop through once quickly to see if any of the serialized pieces will be too big
        for (var i = 0; i < serialized.length; i++) {
          if (serialized[i].length > bank.MAX_SYNC_STRING_SIZE) {
            attemptSave(numSerialize + 1);
            return;
          }
        }

        for (var i = 0; i < serialized.length; i++) {
          // the first entry will have the original key, each entry then points to the next
          var splitKey;
          if (i == 0) {
            splitKey = prefix + id;
          }
          else {
            splitKey = bank.splitListContinuePrefix + id + "@" + (i-1);
          }

          var save = {}
          save[splitKey] = serialized[i];
          chrome.storage.sync.set(save, function() {
            if(typeof(chrome.extension.lastError) != 'undefined') {
              // there was an error in saving
              if (chrome.extension.lastError.message == "Quota exceeded") {
                // got a quota exceeded error, delete any saves in progress and try again
                var deleteObject = [];
                for (var j = 0; j < savedKeys.length; j++){
                  deleteObject.push(savedKeys[j]);
                }
                chrome.storage.sync.remove(deleteObject, function() {
                  attemptSave(numSerialize + 1);
                })
              }
            }
            else {
              // success in saving
              savedKeys.push(splitKey);
              if (savedKeys.length == numSerialize) {
                // we're done here
                bank.checkQuota();
                callback();
              }
            }
          })
        }
      }; // end attemptSave
      attemptSave();
    }
    else {
      try {
        var key = prefix + id;
        var listStr = list.serialize()[0];
        bank.localStorage.setItem(key, listStr);
        callback();
      }
      catch (error) {
        console.error("Could not save playlist '" + list.id + "'");
      }
    }
  },

  addToPlaylistList: function(playlist) {
    var bank = Tapedeck.Backend.Bank;

    bank.saveList(bank.playlistPrefix, playlist.id, playlist, function(){
      Tapedeck.Backend.MessageHandler.updateView("PlaylistList");
    });
  },

  removeFromPlaylistList: function(playlist) {
    var bank = Tapedeck.Backend.Bank;
    var key = bank.playlistPrefix + playlist.id;

    if (bank.isSyncOn()) {
      var nextCount = 0;
      var removePlaylistPiece = function(removeKey) {

        chrome.storage.sync.remove(removeKey, function() {
          if (typeof(chrome.extension.lastError) == "undefined") {
            // see if another piece exists
            var nextKey = bank.splitListContinuePrefix + playlist.id + "@" + nextCount;
            nextCount++;
            removePlaylistPiece(nextKey);
          }
          else {
            // got some error, likely we ran out of keys
            console.log("Can't remove more - " + JSON.stringify(chrome.extension.lastError));
          }
        });
      }
      removePlaylistPiece(key);
    }
    else {
      try {
        bank.localStorage.removeItem(key);
      }
      catch (error) {
        console.error("Could not remove playlist '" + playlist.id + "'");
      }
    }
    Tapedeck.Backend.MessageHandler.updateView("PlaylistList");
  },

  saveTrackList: function(name, trackList) {
    Tapedeck.Backend.Bank.Memory.rememberTrackList(name, trackList);

    Tapedeck.Backend.Bank.saveList(this.trackListPrefix, name, trackList, function() { });
  },

  getTrackList: function(name, callback) {
    var bank = Tapedeck.Backend.Bank;

    // see if the tracklist is remembered, if so return it
    var tracks = bank.Memory.getTrackList(name);
    if (tracks != null) {
      callback(tracks);
      return;
    }

    // tracklist is not remembered, attempt to recover from sync or local filesystem if needed
    var key = bank.trackListPrefix + name;
    if (bank.isSyncOn()) {
      // set to sync mode, get from there

      chrome.storage.sync.get(key, function(storedData) {
        if (typeof(chrome.extension.lastError) != 'undefined') {
          // there was some error
          chrome.error("Error getting synced tracklist '" + JSON.stringify(chrome.extension.lastError) + "'");
        }

        // build the first piece of the trackList with what we just recovered
        var trackListData = null;
        try {
          trackListData = $.parseJSON(storedData[key]);
        }
        catch (error) {
          console.error("Could not recover tracklist '" + name + "'");
        }

        // there can be more pieces to the trackList, look for them and return the trackList when we run out
        var nextCount = 0;
        var foldInContinues = function() {

          // see if another piece exists
          var nextKey = bank.splitListContinuePrefix + name + "@" + nextCount;
          chrome.storage.sync.get(nextKey, function(nextData) {
            if (typeof(chrome.extension.lastError) != 'undefined' ||
                $.isEmptyObject(nextData)) {

              // we're out of pieces, build the trackList and return
              var trackList = new Tapedeck.Backend.Collections.TrackList(trackListData);
              Tapedeck.Backend.Bank.Memory.rememberTrackList(name, trackList);

              callback(trackList);
              return;
            }


            // found another piece, build it and add it to what we have
            var nextPiece = null;
            try {
              nextPiece = $.parseJSON(nextData[nextKey]);
            }
            catch (error) {
              console.error("Could not recover the " + (nextCount + 1) + " piece of tracklist '" + name + "'");
              var trackList = new Tapedeck.Backend.Collections.TrackList(trackListData);
              callback(trackList);
              return;
            }
            trackListData = trackListData.concat(nextPiece);

            // continue to see if there are even more pieces
            nextCount++;
            foldInContinues();
          });
        } // end foldInContinues

        foldInContinues();
      }); // end chrome.storage.sync.get(key, ...
    }
    else {
      tracks = this.recoverLocalList(key);

      // save tracks in memory so that they're ready for use in the future
      Tapedeck.Backend.Bank.Memory.rememberTrackList(name, tracks);

      callback(tracks);
    }
  },

  recoverLocalList: function(key) {
    var tracksJSON = { };
    try {
      var listStr = this.localStorage.getItem(key);
      tracksJSON = $.parseJSON(listStr);
    }
    catch (error) {
      console.error("Could not recover trackList '" + key + "'");
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

  savedQueueName: "__queue",
  saveQueue: function(trackList) {
    var bank = Tapedeck.Backend.Bank;
    bank.saveTrackList(bank.savedQueueName, trackList);
  },
  getQueue: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    bank.getTrackList(bank.savedQueueName, callback);
  },

  savedBrowseListName: "__browseList",
  saveBrowseList: function(trackList) {
    // we only memoize the browseList, we don't persist it in storage
    var bank = Tapedeck.Backend.Bank;
    bank.Memory.rememberTrackList(bank.savedBrowseListName, trackList);
  },
  getBrowseList: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    var tracks = bank.Memory.getTrackList(bank.savedBrowseListName);
    if (typeof(tracks) == "undefined" || tracks == null) {
      tracks = new Tapedeck.Backend.Collections.TrackList();
    }
    callback(tracks);
  },

  setDrawerOpened: function(open) {
    Tapedeck.Backend.Bank.drawerOpen = open;
  },

  getDrawerOpened: function() {
    return Tapedeck.Backend.Bank.drawerOpen;
  },

  getCurrentCassette: function(currentCassette) {
    return this.localStorage.getItem(this.currentCassetteKey);
  },

  saveCurrentCassette: function(currentCassette) {
    this.localStorage.setItem(this.currentCassetteKey, currentCassette);
  },

  saveCassettePage: function(cassetteName, page) {
    var pageKey = Tapedeck.Backend.Bank.cassettePagePrefix +
                  cassetteName;
    var page = Tapedeck.Backend.Bank.localStorage
                                    .setItem(pageKey, page);
  },

  toggleRepeat: function() {
    var oldVal = (this.localStorage.getItem(this.repeatKey) == "true");

    this.localStorage.setItem(this.repeatKey,
                              (oldVal ? "false" : "true"));
  },

  toggleSync: function() {
    var bank = Tapedeck.Backend.Bank;
    var oldVal = bank.localStorage.getItem(bank.syncKey);

    var newVal = "off";
    if (!oldVal || oldVal == "off") {
      newVal = "on";
    }
    bank.localStorage.setItem(bank.syncKey, newVal);
    bank.checkQuota();

    // sync changed so we need to discard the current playlists and get the requested
    bank.preparePlaylistList(function() {
      Tapedeck.Backend.MessageHandler.updateView("PlaylistList");
    });

    // clear the queue from memory so that it gets repopulated
    bank.Memory.clearList(bank.savedQueueName);

    // sync changed so we need to discard the current queue and get the synced one
    Tapedeck.Backend.Sequencer.prepareQueue(function() {
      Tapedeck.Backend.MessageHandler.updateView("Queue");
    });
    Tapedeck.Backend.MessageHandler.forceCheckSync();
  },

  getRepeat: function() {
    return this.localStorage.getItem(this.repeatKey) == "true";
  },

  getSync: function() {
    var sync = this.localStorage.getItem(this.syncKey)
    return (sync ? sync : "off");
  },
  isSyncOn: function() {
    var sync = this.getSync();
    return (sync == "on" || sync == "warn");
  },

  saveVolume: function(volume) {
    this.localStorage.setItem(this.volumeKey, volume);
  },

  getVolume: function() {
    var volume = this.localStorage.getItem(this.volumeKey);
    return ((volume != null) ? volume : 1);
  },

  checkQuota: function() {
    var bank = Tapedeck.Backend.Bank;

    // no-op if sync is off
    var syncState = bank.localStorage.getItem(bank.syncKey);
    if (syncState == "off") {
      return;
    }

    var warningPercent = 0.6;
    var clearWarningPercent = 0.5;

    // we get the bytes in use and show or clear the warnings at
    // the percents set above
    chrome.storage.sync.getBytesInUse(null, function(inUse) {


      if (syncState == "warn" &&
          inUse / chrome.storage.sync.QUOTA_BYTES < clearWarningPercent) {
        // We are showing the warning, but are using less now.  Clear the warning.
        bank.localStorage.setItem(bank.syncKey, "on");
        Tapedeck.Backend.MessageHandler.forceCheckSync();
      }
      else if (inUse / chrome.storage.sync.QUOTA_BYTES > warningPercent) {
        // set sync to the warn state
        bank.localStorage.setItem(bank.syncKey, "warn");

        // we show the modal warning if enough of storage is being used
        var lastWarning = bank.localStorage.getItem(bank.lastSyncWarningKey);
        var now = new Date().getTime();

        // and we only warn once per day
        if (lastWarning == null || (now - lastWarning) > (24 * 60 * 60 * 1000 /* 24 hours */)) {

          // show the modal to explain the high sync usage
          // var dataStr = inUse + "/" + chrome.storage.sync.QUOTA_BYTES + " bytes in use.";
          Tapedeck.Backend.MessageHandler.showModal({
            fields: [
              { type          : "info",
                text          : "Warning: You are approaching your cloud storage capacity." },
              { type          : "info",
                text          : "Tapedeck may become unreliable if you exceed your capacity." },
            ],
            title: "Cassettify Wizard",
          });

          bank.localStorage.setItem(bank.lastSyncWarningKey, now);
        }

        // set the sync icon to the syncWarning
        Tapedeck.Backend.MessageHandler.forceCheckSync();
      }
      else {
        console.log("No warning only using " + inUse + "/" + chrome.storage.sync.QUOTA_BYTES + " bytes of synced storage");
      }
    });
  },
}
