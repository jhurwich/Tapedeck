Tapedeck.Backend.Bank = {

  drawerOpen: true, // TODO set to false
  localStorage: null,

  MAX_SYNC_STRING_SIZE: 2000,   /* 2048 bytes is actual limit */
  MAX_NUMBER_SPLITS: 25,

  defaultBlockPatterns : [ "chrome://",
                           "chrome-devtools://",
                           "mail",
                           "maps.google.com" ],

  bankPrefix: "_td",
  syncOnPostPrefix: "_on",
  syncOffPostPrefix: "_off",
  trackListPiece: "tl-",
  playlistPiece: "pl-",
  trackListPrefix: /* bankPrefix + trackListPiece + sync[On|Off]PostPrefix*/ "",
  playlistPrefix: /* bankPrefix + trackListPiece + playlistPiece + sync[On|Off]PostPrefix*/ "",
  splitListContinuePrefix: /* bankPrefix + */ "listContinue",
  repeatKey: /* bankPrefix + */ "repeat",
  syncKey: /* bankPrefix + */ "sync",
  volumeKey: /* bankPrefix + */ "volume",
  blockKey: /* bankPrefix + */ "block",
  lastSyncWarningKey: /* bankPrefix + */ "lastSyncWarning",
  currentCassetteKey: /* bankPrefix + */ "currentCassette",
  cassettePagePrefix: /* bankPrefix + */ "cassettePages",
  savedQueueName: "__q",
  init: function(continueInit) {
    var bank = this;
    bank.localStorage = window.localStorage;

    bank.repeatKey = bank.bankPrefix + bank.repeatKey;
    bank.syncKey = bank.bankPrefix + bank.syncKey;
    bank.blockKey = bank.bankPrefix + bank.blockKey;
    bank.lastSyncWarningKey = bank.bankPrefix + bank.lastSyncWarningKey;

    bank.currentCassetteKey = bank.bankPrefix + bank.currentCassetteKey;
    bank.cassettePagePrefix = bank.bankPrefix + bank.cassettePagePrefix;

    // pick the namespace for local (off) or synced (on) tracklists
    var syncVal = bank.localStorage.getItem(bank.syncKey);
    if (typeof(syncVal) == "undefined" || syncVal != "on") {
      syncVal = "off";
    }
    bank.generateTrackListPrefixes(syncVal);

    if (bank.localStorage.getItem(bank.repeatKey) == null) {
      bank.localStorage.setItem(bank.repeatKey, "true");
    }
    if (bank.localStorage.getItem(bank.syncKey) == null) {
      bank.localStorage.setItem(bank.syncKey, "off");
    }
    // initialize the block list if necessary
    if (bank.localStorage.getItem(bank.blockKey) == null) {
      bank.saveBlockList(bank.defaultBlockPatterns);
    }

    chrome.storage.onChanged.addListener(bank.storageChangeListener);

    // initialize each subsystem
    bank.Memory.init();
    bank.FileSystem.init(function() {
      bank.PlaylistList = new Tapedeck.Backend.Collections.PlaylistList();
      bank.PlaylistList.init(function() {
        // Attach events to ensure the browseList is updated and saved properly.
        // Kind of wish there was a better place to do this.
        Tapedeck.Backend.Bank.getCurrentBrowseList(function(browseList) {
          browseList.bind("change tracks", function() {
            Tapedeck.Backend.MessageHandler.pushBrowseTrackList(this);
          })

          continueInit();
        });
      });
    });
  },

  generateTrackListPrefixes: function(syncVal) {
    var bank = Tapedeck.Backend.Bank;
    var syncPrefix = "";
    if (bank.syncOnPostPrefix.indexOf(syncVal) != -1) {
      syncPrefix = bank.syncOnPostPrefix;
    }
    else {
      syncPrefix = bank.syncOffPostPrefix;
    }

    bank.trackListPrefix = bank.bankPrefix + bank.trackListPiece + syncPrefix;
    bank.playlistPrefix = bank.bankPrefix + bank.trackListPiece + bank.playlistPiece + syncPrefix;
  },

  // We expect this to be the most commonly used function so it is
  // memoized.
  blockList : null,
  getBlockList : function() {
    var bank = Tapedeck.Backend.Bank;

    // Load the blocklist if we have not already
    if (bank.blockList == null) {
      var blockStr = bank.localStorage.getItem(bank.blockKey);
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

    // Returns cassetteDatas of the form - name: "", contents: "", url: "" (, page: num)
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

    // we associate the trackList to a key, but for the browseList we use it's name
    rememberTrackList: function(key, trackList) {
      var bank = Tapedeck.Backend.Bank
      this.trackLists[key] = trackList;
    },

    getTrackList: function(key) {
      if (typeof(this.trackLists[key]) != undefined) {
        return this.trackLists[key];
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
    if (typeof(this.PlaylistList) != "undefined" &&
        this.PlaylistList != null) {
      this.PlaylistList.reset();
    }
    this.localStorage.clear();
    this.FileSystem.clear();
  },

  findKeys: function(pattern, callback) {
    var bank = Tapedeck.Backend.Bank;
    var found = [];
    var regex = new RegExp(pattern, '');

    var getLocalKeys = function() {
      var toReturn = [];
      for (var i = 0; i < bank.localStorage.length; i++) {
        var key = bank.localStorage.key(i);
        if (key.match(regex)) {
          toReturn.push(key);
        }
      }
      return toReturn;
    };

    // search the Sync keys or the local keys
    if (Tapedeck.Backend.Bank.isSyncOn()) {
      chrome.storage.sync.get(null, function(allKeys) {
        for (var key in allKeys) {
          if (key.match(regex)) {
            found.push(key);
          }
        }

        // it's possible for a sync list to be local but not synced yet, check for those
        var local = getLocalKeys();
        for (var i = 0; i < local.length; i++) {
          if (!(local[i] in allKeys)) {
            found.push(local[i]);
          }
        }

        callback(found);
      });
    }
    else {
      found = getLocalKeys();
      callback(found);
    }
  },

  PlaylistList: null, // PlaylistList is its own subsystem
  savePlaylist: function(playlist) {
    var bank = Tapedeck.Backend.Bank;

    var found = bank.PlaylistList.get(playlist.id);
    if (found != null) {
      bank.removePlaylist(found);
    }
    bank.PlaylistList.add(playlist);
  },

  removePlaylist: function(playlist) {
    Tapedeck.Backend.Bank.PlaylistList.remove(playlist);
  },

  getPlaylists: function() {
    if (this.PlaylistList == null) {
      console.error("PlaylistList is not ready.")
    }
    return this.PlaylistList;
  },

  clearList: function(prefix, id, callback) {
    var bank = Tapedeck.Backend.Bank;

    if (bank.isSyncOn()) {
      var key = prefix + id;
      var nextCount = 0;
      chrome.storage.sync.get(null, function(allKeys) {

        var removePiece = function(removeKey) {
          chrome.storage.sync.remove(removeKey, function() {
            // see if another piece exists
            var nextKey = bank.splitListContinuePrefix + id + "@" + nextCount;
            nextCount++;
            if (nextKey in allKeys && typeof(chrome.extension.lastError) == "undefined") {
              removePiece(nextKey);
            }
            else {
              // got some error, likely we ran out of keys
              if (typeof(callback) != "undefined") {
                callback();
              }
            }
          });
        }

        if (key in allKeys) {
          removePiece(key);
        }
      }); // end chrome.storage.get(null, ...
    }
    else {
      // TODO decide if we need to do anything here for the non-Sync case
    }
  },

  getSavedTrackList: function(key, callback) {
    var bank = Tapedeck.Backend.Bank;

    // see if the tracklist is remembered, if so return it
    var tracks = bank.Memory.getTrackList(key);
    if (tracks != null) {
      callback(tracks);
      return;
    }


    // this will create the tracklist if it doesn't exist
    this.recoverSavedTrackList(key, function(savedTracks) {

      // save tracks in memory so that they're ready for use in the future
      Tapedeck.Backend.Bank.Memory.rememberTrackList(key, savedTracks);
      callback(savedTracks);
    });
  },

  recoverSavedTrackList: function(key, callback) {
    var bank = Tapedeck.Backend.Bank;
    var id = key;
    id = id.replace(bank.bankPrefix, "");
    id = id.replace(bank.trackListPiece, "");
    id = id.replace(bank.playlistPiece, "");
    id = id.replace(bank.syncOnPostPrefix, "");
    id = id.replace(bank.syncOffPostPrefix, "")

    var makeListAndReturn = function(json) {
      var list;
      if (key.match(new RegExp(bank.playlistPiece))) {
        list = new Tapedeck.Backend.Collections.Playlist(json, { id: id, save: false });
      }
      else {
        list = new Tapedeck.Backend.Collections.SavedTrackList(json, { id: id, save: false });
      }

      list.removeTempProperties(); // TODO do we need this?
      callback(list);
    };

    if (bank.isSyncOn()) {
      // recover from sync
      chrome.storage.sync.get(null, function(storedData) {
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
          console.error("Could not recover tracklist '" + id + "'");
        }

        /* There can be more pieces to the trackList, look for them by
         * recursively looking for the next piece's key until we run out */
        var nextCount = 0;
        var foldInContinues = function() {

          // see if another piece exists
          var nextKey = bank.splitListContinuePrefix + id + "@" + nextCount;
          chrome.storage.sync.get(nextKey, function(nextData) {
            if (typeof(chrome.extension.lastError) != 'undefined' ||
                $.isEmptyObject(nextData)) {
              // we're out of pieces, build the trackList and return

              makeListAndReturn(trackListData);
              return;
            }

            // found another piece, build it and add it to what we have
            var nextPiece = null;
            try {
              nextPiece = $.parseJSON(nextData[nextKey]);
            }
            catch (error) {
              console.error("Could not recover the " + (nextCount + 1) + " piece of tracklist '" + id + "'");

              makeListAndReturn(trackListData);
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
      // recover locally
      try {
        var listStr = this.localStorage.getItem(key);
        var tracksJSON = false;
        if (listStr != null) {
          tracksJSON = $.parseJSON(listStr);
        }
        makeListAndReturn(tracksJSON);
      }
      catch (error) {
        console.error("Could not recover trackList '" + key + "'");
      }
    }
  },

  getQueue: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    bank.getSavedTrackList(bank.trackListPrefix + bank.savedQueueName, callback);
  },

  // NOTE, the browselist is only memoized by the Bank, it is not SavedTrackList
  savedBrowseListName: "__browseList",
  saveCurrentBrowseList: function(trackList) {
    // we only memoize the browseList, we don't persist it in storage
    var bank = Tapedeck.Backend.Bank;

    var browseListChanged = function (eventName) {
      // we only care about the greater 'change' event.  The "change:__" events are ignored.
      if (eventName.indexOf("change:") == -1) {

        // Force the browselist to be updated outside of the normal self-populated path.
        // That path will generate a new browselist, blowing away this change before we can show it.
        Tapedeck.Backend.MessageHandler.pushBrowseTrackList(trackList);
      }
    }
    trackList.bind("all", browseListChanged);

    bank.Memory.rememberTrackList(bank.savedBrowseListName, trackList);
  },
  getCurrentBrowseList: function(callback) {
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

    // if we are going from on to off, sync everything immediately one last time
    if (newVal == "off") {
      bank.sync(true);
    }
    bank.checkQuota();

    // sync changed so we need to discard the current playlists and get the requested
    bank.generateTrackListPrefixes(newVal);

    bank.PlaylistList = new Tapedeck.Backend.Collections.PlaylistList();
    bank.PlaylistList.init(function() {
      Tapedeck.Backend.MessageHandler.updateView("PlaylistList");
    });

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
    return;
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

  // we provide a 20s sliding window for new changes, new changes reset the timer
  collector: null,
  sync: function(now) {
    if (typeof(now) == "undefined") {
      now = false;
    }
    var bank = Tapedeck.Backend.Bank;

    if (bank.collector != null) {
      window.clearTimeout(bank.collector);
    }

    if (!now) {
      bank.collector = window.setTimeout(bank.syncCollector, 5 * 1000 /* 20s */);
    }
    else {
      bank.syncCollector();
    }
  },

  syncCollector: function() {
    console.log(" = = = = = = = = = = = SYNCCOLLECTOR = = = = = = = = = ");
    var bank = Tapedeck.Backend.Bank;
    bank.findKeys(bank.trackListPiece + ".*" + bank.syncOnPostPrefix, function(syncKeys) {
      for (var i = 0; i < syncKeys.length; i++) {
        bank.getSavedTrackList(syncKeys[i], function(trackList) {

          if (trackList.dirty) {
            console.log("'" + trackList.id +  "' is dirty, writing to sync");
            // trackList is dirty, upload to sync
            // we may have to split the list up, attempt to split into up to 25 pieces
            var attemptSave = function(numSerialize) {
              if (typeof(numSerialize) == "undefined") {
                numSerialize = 1;
              }
              if (numSerialize > bank.MAX_NUMBER_SPLITS) {
                // Don't do splits this large, just give up
                console.error("Won't split playlist into " + numSerialize + " parts for saving.  Playlist is too large.")

                Tapedeck.Backend.MessageHandler.showModal({
                  fields: [
                    { type          : "info",
                      text          : "One of your playlists is too long to save and sync."},
                    { type          : "info",
                      text          : "Consider turning off syncing." },
                  ],
                  title: "Cassettify Wizard",
                });
                return;
              }

              // return numSerialize number of strings to save for this one playlist
              var savedKeys = [];
              var serialized = trackList.serialize(numSerialize);

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
                  splitKey = trackList.getPrefix() + trackList.id;
                }
                else {
                  splitKey = bank.splitListContinuePrefix + trackList.id + "@" + (i-1);
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

                      if (!$.isEmptyObject(deleteObject)) {
                        chrome.storage.sync.remove(deleteObject, function() {
                          attemptSave(numSerialize + 1);
                        })
                      }
                    }
                  }
                  else {
                    // success in saving
                    savedKeys.push(splitKey);
                    if (savedKeys.length == numSerialize) {
                      // we're done here
                      bank.checkQuota();
                    }
                  }
                })
              }
            }; // end attemptSave
            attemptSave();

            trackList.dirty = false;
          }
          else {
            console.log("'" + trackList.id +  "' is  not dirty");          }
        });
      }
    });

    bank.collector = null;
  },

 storageChangeListener: function(changes, namespace) {
   var bank = Tapedeck.Backend.Bank;

   for (var changedKey in changes) {
     if (changedKey.indexOf(bank.playlistPrefix) != -1) {
       // playlists were changed somewhere
       Tapedeck.Backend.MessageHandler.updateView("PlaylistList");
     }
     else if (changedKey.indexOf(bank.trackListPrefix) != -1) {
       // a tracklist (likely queue) was changed somewhere
       if (changedKey.indexOf(bank.savedQueueName) != -1) {
         Tapedeck.Backend.Sequencer.queue.trigger("change tracks");
       }
     }
   }
 },
}
