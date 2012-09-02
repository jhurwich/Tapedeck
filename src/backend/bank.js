Tapedeck.Backend.Bank = {

  DEBUG_LEVELS: {
    NONE  : 0,
    BASIC : 1,
    ALL   : 2,
  },
  debug: 0,

  // constants for track modifying in preparation to save
  DONT_SERIALIZE_PROPERTIES: ['description',
                              'location',
                              'downloading',
                              'currentTime',
                              'domain'],
  MINIFY_MAP: { "listened": "l",
                "playing": "p",
                "artistName": "aN",
                "trackName": "tN",
                "cassette": "c",
                "type" : "t",
                "url" : "u",
                "domain" : "d",
                "tdID" : "td"  },
  UMMINIFY_MAP: null,

  drawerOpen: false,
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
  syncLogPrefix:  /* bankPrefix + */ "syncLog",
  savedQueueName: "__q",
  init: function(continueInit) {
    var bank = this;
    if (bank.UNMINIFY_MAP == null) {
      bank.UNMINIFY_MAP = {}

      for (var prop in bank.MINIFY_MAP) {
        bank.UNMINIFY_MAP[bank.MINIFY_MAP[prop]] = prop;
      }
    }

    bank.localStorage = window.localStorage;

    bank.repeatKey = bank.bankPrefix + bank.repeatKey;
    bank.syncKey = bank.bankPrefix + bank.syncKey;
    bank.blockKey = bank.bankPrefix + bank.blockKey;
    bank.lastSyncWarningKey = bank.bankPrefix + bank.lastSyncWarningKey;

    bank.currentCassetteKey = bank.bankPrefix + bank.currentCassetteKey;
    bank.cassettePagePrefix = bank.bankPrefix + bank.cassettePagePrefix;

    bank.syncLogPrefix = bank.bankPrefix + bank.syncLogPrefix;

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

  // checkSync is optional;
  findKeys: function(pattern, checkSync, callback) {
    if (arguments.length == 2) {
      callback = checkSync;
      checkSync = Tapedeck.Backend.Bank.isSyncOn();
    }
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
    if (checkSync) {
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

  clearList: function(trackList) {
    var bank = Tapedeck.Backend.Bank;

    try {
      var key = trackList.getPrefix() + trackList.id;
      bank.localStorage.removeItem(key);
    }
    catch (error) {
      console.error("Could not remove playlist '" + trackList.id + "'");
    }

    if (bank.isSyncOn()) {
      var key = trackList.getPrefix() + trackList.id;
      var nextCount = 0;
      chrome.storage.sync.get(null, function(allKeys) {

        var removePiece = function(removeKey) {
          chrome.storage.sync.remove(removeKey, function() {
            // see if another piece exists
            var nextKey = bank.splitListContinuePrefix + trackList.id + "@" + nextCount;
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
        console.error("Could not recover trackList '" + key + "': " + JSON.stringify(error));
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
    var bank = Tapedeck.Backend.Bank;

    // no-op if sync is off
    if (!bank.isSyncOn()) {
      return;
    }
    // == warning and clearing values ==
    // MAX_WRITE_OPERATIONS_PER_HOUR
    var warnWritesPerHour = 900;
    var clearWritesPerHour = 800

    // MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE
    var warnWritesPerTenMin = 80;
    var clearWritesPerTenMin = 70;

    // QUOTA_BYTES
    var warnTotalUsePercent = 0.7;
    var clearTotalUsePercent = 0.6;

    // first check against sync.MAX_WRITE_OPERATIONS_PER_HOUR
    // and sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE
    var tenMinAgo = new Date();
    tenMinAgo.setMinutes(tenMinAgo.getMinutes() - 11); // 1 min extra buffer
    var sixtyMinAgo = new Date();
    sixtyMinAgo.setMinutes(sixtyMinAgo.getMinutes() - 61); // 1 min extra buffer
    var withinTen = 0;
    var withinSixty = 0;

    bank.getSyncLog(function(syncLog) {
      for (var i = (syncLog.length - 1); i >= 0; i--) {
        var logObj = syncLog[i];
        var time = new Date(logObj.time);

        if (time > tenMinAgo) {
          withinTen++;
          withinSixty++;
        }
        else if (time > sixtyMinAgo) {
          withinSixty++;
        }
        else {
          break;
        }
      }

      // warn for time-based quotas
      if (withinSixty > warnWritesPerHour) {
        var messages = ["Warning: You are changing Tapedeck's cloud storage frequently.",
                        "Tapedeck may not be able to make many more writes this hour."];
        bank.showSyncWarning(messages);
      }
      if (withinTen > warnWritesPerTenMin) {
        var messages = ["Warning: You have made many changes to cloud storage recently.",
                        "Tapedeck may not be able to keep up with your changes."];
        bank.showSyncWarning(messages);
      }

      // we get the bytes in use and show or clear the warnings at
      // the percents set above to warn of sync.QUOTA_BYTES
      chrome.storage.sync.getBytesInUse(null, function(inUse) {

        // If we are showing the warning, figure out if we can clear it, checking each quota's clear marker.
        var syncState = bank.getSync();
        if (syncState == "warn" &&
            inUse / chrome.storage.sync.QUOTA_BYTES < clearTotalUsePercent &&
            withinSixty < clearWritesPerHour &&
            withinTen < clearWritesPerTenMin) {
          bank.localStorage.setItem(bank.syncKey, "on");
          Tapedeck.Backend.MessageHandler.forceCheckSync();
        }
        else if (inUse / chrome.storage.sync.QUOTA_BYTES > warnTotalUsePercent) {
          var messages = ["Warning: You are approaching your cloud storage capacity.",
                          "Tapedeck may become unreliable if you exceed your capacity."];
          bank.showSyncWarning(messages);
        }
        else {
          console.log("No warning: Using " + inUse + "/" + chrome.storage.sync.QUOTA_BYTES + " bytes, " + withinTen + " writes in last 10, " + withinSixty + " in last hour.");
        }
      });
    }); // end getSyncLog
  },

  showSyncWarning: function(messages) {
    var bank = Tapedeck.Backend.Bank;

    // set sync to the warn state
    bank.localStorage.setItem(bank.syncKey, "warn");

    // we show the modal warning if enough of storage is being used
    var lastWarning = bank.localStorage.getItem(bank.lastSyncWarningKey);

    // and we only warn once per day
    var now = new Date().getTime();
    if (lastWarning == null || (now - lastWarning) > (24 * 60 * 60 * 1000 /* 24 hours */)) {

      // show the modal to explain the high sync usage
      var fields = []
      for (var i = 0; i < messages.length; i++) {
        fields.push({ type: "info", text: messages[i] });
      }
      Tapedeck.Backend.MessageHandler.showModal({
        fields: fields,
        title: "Cassettify Wizard",
      });

      bank.localStorage.setItem(bank.lastSyncWarningKey, now);
    }

    // set the sync icon to the syncWarning
    Tapedeck.Backend.MessageHandler.forceCheckSync();
  },

  // we provide a 20s sliding window for new changes, new changes reset the timer
  collector: null,
  sync: function(now) {
    if (typeof(now) != "boolean") {
      now = false;
    }
    var bank = Tapedeck.Backend.Bank;

    if (bank.collector != null) {
      window.clearTimeout(bank.collector);
    }

    if (!now) {
      bank.collector = window.setTimeout(bank.syncCollector, 15 * 1000 /* 15s */);
    }
    else {
      bank.syncCollector();
    }
  },

  // syncMetadata and recoverMetadata methods
  // metadata currently includes: queuePosition
  dirtyMetadata: false,
  syncMetadata: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    var save = {};

    var queuePosition = Tapedeck.Backend.Sequencer.getQueuePosition();
    save['queuePosition'] = queuePosition;

    if (JSON.stringify(save).length > bank.MAX_SYNC_STRING_SIZE) {
      console.error("Metadata is now too large to sync.")
    }
    else {
      chrome.storage.sync.set(save, function() {
        if(typeof(chrome.extension.lastError) != 'undefined') {
          // there was an error in saving
          console.error("Error when setting metadata: " + chrome.extension.lastError.message)
        }
        else {
          // success in saving
          bank.dirtyMetadata = false;
          callback();
        }
      });
    }
  },

  recoverMetadata: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    var sqcr = Tapedeck.Backend.Sequencer;
    var toRecover = { queuePosition: -1 };
    chrome.storage.sync.get(toRecover, function(recovered) {
      if (recovered.queuePosition != -1  &&
          recovered.queuePosition < sqcr.queue.length) {
        sqcr.Player.currentState = sqcr.Player.STATES.PAUSE;
        sqcr.setQueuePosition(recovered.queuePosition);
      }
      callback();
    })
  },

  trackListSplitCounts: {},
  syncCollector: function() {
    var bank = Tapedeck.Backend.Bank;

    if (bank.dirtyMetadata) {
      console.log("^^^ metadata is dirty ^^^");
      bank.syncMetadata(function() {
        bank.syncCollector();
      })
      return;
    }
    console.log(" = = = = = = = = = = = SYNCCOLLECTOR = = = = = = = = = ");

    // find all the tracklists for which sync is on
    bank.findKeys(bank.trackListPiece + ".*" + bank.syncOnPostPrefix, true, function(syncKeys) {
      for (var i = 0; i < syncKeys.length; i++) {
        bank.getSavedTrackList(syncKeys[i], function(trackList) {

          if (trackList.dirty) {
            console.log("'" + trackList.id +  "' is dirty, writing to sync");
            // trackList is dirty, upload to sync
            // we may have to split the list up, attempt to split into up to 25 pieces
            var attemptSave = function() {

              // serialize the strings such that none is greater than MAX_SYNC_STRING_SIZE
              var serialized = trackList.serialize(bank.MAX_SYNC_STRING_SIZE);

              if (serialized.length > bank.MAX_NUMBER_SPLITS) {
                // Don't do splits this large, just give up
                console.error("Won't split playlist into " + serialized.length + " parts for saving.  Playlist is too large.")

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

              // this function will save the serialized list, but we might need to remove some first, see below
              var saveSerialized = function() {
                var canSetG2k = false; // check if true here will ever work
                if (canSetG2k) {
                  var save = {}
                  for (var i = 0; i < serialized.length; i++) {
                    // the first entry will have the original key, each entry then points to the next
                    var splitKey;
                    if (i == 0) {
                      splitKey = trackList.getPrefix() + trackList.id;
                    }
                    else {
                      splitKey = bank.splitListContinuePrefix + trackList.id + "@" + (i-1);
                    }
                    save[splitKey] = serialized[i];
                  }

                  bank.logSync(save);
                  chrome.storage.sync.set(save, function() {
                    if(typeof(chrome.extension.lastError) != 'undefined') {
                      // there was an error in saving

                      if (chrome.extension.lastError.message == "Quota exceeded") {
                        // TODO handle this better / warn user?
                        console.error(chrome.extension.lastError.message);
                        bank.dumpSyncLog();
                      }
                    }
                    else {

                      // success in saving
                      bank.checkQuota();
                    }
                  });
                }
                else {
                  // canSetG2k == false
                  var savedKeys = [];
                  for (var i = 0; i < serialized.length; i++) {
                    // the first entry will have the original key, each entry then points to the next
                    var splitKey;
                    if (i == 0) {
                      splitKey = trackList.getPrefix() + trackList.id;
                    }
                    else {
                      splitKey = bank.splitListContinuePrefix + trackList.id + "@" + (i-1);
                    }

                    var save = {};
                    save[splitKey] = serialized[i];

                    bank.logSync(save);
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
                              // TODO handle this better / warn user?
                              console.error(chrome.extension.lastError.message);
                              bank.dumpSyncLog();
                            })
                          }
                        }
                      }
                      else {
                        // success in saving
                        savedKeys.push(splitKey);
                        if (savedKeys.length == serialized.length) {
                          // we're done here
                          bank.checkQuota();
                        }
                      }
                    }); // end set()
                  }
                }
              }; // end saveSerialized

              // if we split into more pieces the last time we synced, we need to remove the old continue pieces
              if (bank.trackListSplitCounts[trackList.id] > serialized.length) {
                var numToRemove = bank.trackListSplitCounts[trackList.id] - serialized.length;
                var removeKeys = [];
                for (var i = 0; i < numToRemove; i++) {
                  // -2 because listContinues start with the second list and at 0 instead of 1
                  var suffix = bank.trackListSplitCounts[trackList.id] - i - 2;
                  removeKeys.push(bank.splitListContinuePrefix + trackList.id + "@" + suffix)
                }
                chrome.storage.sync.remove(removeKeys, saveSerialized);
              }
              else {
                saveSerialized();
              }

              bank.trackListSplitCounts[trackList.id] = serialized.length;
            }; // end attemptSave
            attemptSave();

            trackList.dirty = false;
          }
        }); // end bank.getSavedTrackList
      }
    }); // end bank.findKeys

    bank.collector = null;
  },

  logSync: function(save) {
    var bank = Tapedeck.Backend.Bank;

    // if debug is on log all sync sets
    var currentTime = new Date().getTime();
    var size = JSON.stringify(save).length;
    var logObj = { time: currentTime, size: size };

    if (bank.debug > bank.DEBUG_LEVELS.NONE) {
      var lists = [];
      for (var key in save) {
        var list = [key, save[key].length]
        lists.push(list)
      }

      logObj['lists'] = lists;
      if (bank.debug == bank.DEBUG_LEVELS.ALL) {
        logObj['saved'] = JSON.stringify(save);
      }
    }

    var key = bank.syncLogPrefix + currentTime;
    bank.localStorage.setItem(key, JSON.stringify(logObj));
  },

  getSyncLog: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    bank.findKeys("^" + bank.syncLogPrefix, false, function(logKeys) {
      var syncLog = [];
      var hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);

      for (var i = 0; i < logKeys.length; i++) {
        var logObj = JSON.parse(bank.localStorage.getItem(logKeys[i]));

        // unless we are debug == ALL, we clear log entries older than an hour
        if (bank.debug != bank.DEBUG_LEVELS.ALL) {
          var time = new Date(logObj.time);
          if (time < hourAgo) {
            bank.localStorage.removeItem(logKeys[i]);
            continue;
          }
        }
        syncLog.push(logObj);
      }
      callback(syncLog);
    })
  },

  // dumps the contents of the syncLog of the form:
  // <time as date> <size>chars: <keys and sizes> (\n <saved object depending on log level>
  dumpNum: 0,
  dumpSyncLog: function() {
    var bank = Tapedeck.Backend.Bank;
    if (bank.debug == bank.DEBUG_LEVELS.NONE) {
      return;
    }

    bank.getSyncLog(function(syncLog) {
      for (var i=0; i < syncLog.length; i++) {
        var str = "#" + bank.dumpNum + " ";
        var logObj = syncLog[i];
        var time = new Date(logObj.time);
        str += time.toTimeString() + " ";
        str += logObj.size + "chars";

        if (typeof(logObj.lists) != "undefined") {
          str += ": ";
          for (var j = 0; j < logObj.lists.length; j++) {
            var list = logObj.lists[j];
            for (var k = 0; k < list.length; k++) {
              str += list[k] + ", "
            }
            str = str.substring(0, str.length-2)
            str += " - ";
          }
          str = str.substring(0, str.length-3)
        }

        if (bank.debug == bank.DEBUG_LEVELS.ALL) {
          str += "\n\t";
          str += logObj.saved;
        }
        console.log(str);
      }
      bank.dumpNum++;
    });

  },

  log: function(str, level) {
    var self = Tapedeck.Backend.Bank;
    if (self.debug == self.DEBUG_LEVELS.NONE) {
      return;
    }
    if (typeof(level) == "undefined") {
      level = self.DEBUG_LEVELS.BASIC;
    }
    if (self.debug >= level) {
      var currentTime = new Date();
      console.log("Bank (" + currentTime.getTime() + ") : " + str);
    }
  }
}
