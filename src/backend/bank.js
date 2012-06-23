Tapedeck.Backend.Bank = {

  drawerOpen: true, // TODO change back
  localStorage: null,


  defaultBlockPatterns : [ "chrome://",
                           "chrome-devtools://",
                           "mail",
                           "maps.google.com" ],

  bankPrefix: "_tapedeckbank_",
  trackListPrefix: /* bankPrefix + */ "trackList-",
  playlistPrefix: /* trackListPrefix + */ "playlist-",
  currentCassetteKey: /* bankPrefix + */ "currentCassette",
  cassettePagePrefix: /* bankPrefix + */ "cassettePages",
  repeatKey: /* bankPrefix + */ "repeat",
  syncKey: /* bankPrefix + */ "sync",
  volumeKey: /* bankPrefix + */ "volume",
  blockKey: /* bankPrefix + */ "block",
  init: function(continueInit) {
    this.localStorage = window.localStorage;

    this.trackListPrefix = this.bankPrefix + this.trackListPrefix;
    this.playlistPrefix = this.trackListPrefix + this.playlistPrefix;
    this.currentCassetteKey = this.bankPrefix + this.currentCassetteKey;
    this.cassettePagePrefix = this.bankPrefix + this.cassettePagePrefix;
    this.repeatKey = this.bankPrefix + this.repeatKey;
    this.syncKey = this.bankPrefix + this.syncKey;
    this.blockKey = this.bankPrefix + this.blockKey;
    if (this.localStorage.getItem(this.repeatKey) == null) {
      this.localStorage.setItem(this.repeatKey, "true");
    }
    if (this.localStorage.getItem(this.syncKey) == null) {
      this.localStorage.setItem(this.syncKey, "true");
    }
    // initialize the block list if necessary
    if (this.localStorage.getItem(this.blockKey) == null) {
      this.saveBlockList(this.defaultBlockPatterns);
    }

    this.Memory.init();
    this.FileSystem.init(function() {
      continueInit();
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
                               this.errorHandler)
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

            var bb = new (window.BlobBuilder || window.WebKitBlobBuilder)();
            bb.append(code);
            fileWriter.write(bb.getBlob('text/plain'));
          }, fs.errorHandler);
        }, fs.errorHandler);
      }, fs.errorHandler);
    },

    removeCassette: function(name, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;

      fs.root.getDirectory('Cassettes', {create: true}, function(dirEntry) {
        dirEntry.getFile(name, {create: true}, function(fileEntry) {

          fileEntry.remove(function() {
            callback();
          }, fs.errorHandler);

        }, fs.errorHandler);
      }, fs.errorHandler);

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

            var bb = new (window.BlobBuilder || window.WebKitBlobBuilder)();
            bb.append(code);
            fileWriter.write(bb.getBlob('text/plain'));
          }, fs.errorHandler);
        }, fs.errorHandler);
      }, fs.errorHandler);
    },

    // returns an array of { name: __, contents:<string_contents>, url:<fs_url> }
    loadDir: function(dir, callback) {
      var fs = Tapedeck.Backend.Bank.FileSystem;
      var datas = [];

      fs.root.getDirectory(dir, {create: true}, function(dirEntry) {
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
      }, fs.errorHandler);
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

  Memory: {
    tracks: { },
    urlMap:   { }, // maps a url to a tracksData object
    /* tracksData = { tracks: _, expiry: _ } */

    init: function() {
      var mem = Tapedeck.Backend.Bank.Memory;
      window.setInterval(mem.memoryCollector, 1000 * 60 * 5); /* 5 min */
    },

    // save a mapping of url to trackJSONs
    saveTracksForURL: function(url, tracks) {
      var mem = Tapedeck.Backend.Bank.Memory;
      url = url.replace("http://", "");
      url = url.replace("www.", "");

      var expiry =(new Date()).getTime() + (1000 * 60 * 15); /* in 15 min */
      mem.urlMap[url] = { tracks: tracks, expiry: expiry };
    },

    saveMoreTracksForURL: function(url, tracks) {
      var mem = Tapedeck.Backend.Bank.Memory;
      url = url.replace("http://", "");
      url = url.replace("www.", "");

      var currTracks = mem.urlMap[url].tracks;
      tracks = currTracks.concat(tracks);

      var expiry =(new Date()).getTime() + (1000 * 60 * 15); /* in 15 min */
      mem.urlMap[url] = { tracks: tracks, expiry: expiry };
    },

    // retrieve an array of trackJSONs for the url, null if not found
    getTracksForURL: function(url) {
      var mem = Tapedeck.Backend.Bank.Memory;

      if (typeof(mem.urlMap[url]) != "undefined") {
        // tracks found, but make sure they aren't expired
        if ((mem.urlMap[url].expiry - (new Date()).getTime()) < 0) {
          delete mem.urlMap[url];
          return null;
        }
        return mem.urlMap[url].tracks;
      }
      else {
        return null;
      }
    },

    // Cleanup any expired pages
    memoryCollector: function() {
      var mem = Tapedeck.Backend.Bank.Memory;
      for(var url in mem.urlMap) {
        var expiry = mem.urlMap[url].expiry;
        if ((expiry - (new Date()).getTime()) < 0) {
          delete mem.urlMap[url];
        }
      }
    },

    tracks: { },
    trackLists: { },

    rememberTrackList: function(name, trackList) {
      this.trackLists[name] = trackList;
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

    forgetList: function(name) {
      delete this.trackLists[name];
    },
  },

  // returns null if not found
  getTracksForURL: function(url) {
    var mem = Tapedeck.Backend.Bank.Memory;
    return mem.getTracksForURL(url);
  },

  // trackJSONs are saved
  saveTracksForURL: function(url, tracks) {
    var mem = Tapedeck.Backend.Bank.Memory;
    return mem.saveTracksForURL(url, tracks);
  },
  saveMoreTracksForURL: function(url, tracks) {
    var mem = Tapedeck.Backend.Bank.Memory;
    return mem.saveMoreTracksForURL(url, tracks);
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
      this.playlistList = new Tapedeck.Backend.Collections.PlaylistList();

      if (this.getSync()) {
        // Sync is active
        console.log("can storage? " + typeof(chrome.storage));
      }
      else {
        // Local mode
        var playlistKeys = this.findKeys("^" + this.playlistPrefix + ".*");
        for (var i = 0; i < playlistKeys.length; i++) {
          var key = playlistKeys[i];
          var playlist = Tapedeck.Backend.Bank.recoverList(key);
          this.playlistList.add(playlist);
        }

        this.playlistList.bind("add", this.addToPlaylistList);
        this.playlistList.bind("remove", this.removeFromPlaylistList);
      }
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
    Tapedeck.Backend.MessageHandler.updateView("PlaylistList");
  },

  removeFromPlaylistList: function(playlist) {
    var key = Tapedeck.Backend.Bank.playlistPrefix + playlist.id;

    try {
      Tapedeck.Backend.Bank.localStorage.removeItem(key);
    }
    catch (error) {
      console.error("Could not remove playlist '" + playlist.id + "'");
    }
    Tapedeck.Backend.MessageHandler.updateView("PlaylistList");
  },

  saveTrackList: function(name, trackList) {
    Tapedeck.Backend.Bank.Memory.rememberTrackList(name, trackList);

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
    var tracks = this.recoverList(key);

    // save tracks in memory so that they're ready for use
    Tapedeck.Backend.Bank.Memory.rememberTrackList(name, tracks);
    return tracks;
  },

  clearTrackList: function(name) {
    Tapedeck.Backend.Bank.Memory.forgetList(name);

    var key = this.trackListPrefix + name;
    try {
      this.localStorage.removeItem(key);
    }
    catch (error) {
      console.error("Could not remove trackList '" + name + "'");
    }
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

  savedQueueName: "__queue",
  saveQueue: function(trackList) {
    var bank = Tapedeck.Backend.Bank;
    bank.saveTrackList(bank.savedQueueName, trackList);
  },
  getQueue: function() {
    var bank = Tapedeck.Backend.Bank;
    return bank.getTrackList(bank.savedQueueName);
  },
  clearQueue: function() {
    var bank = Tapedeck.Backend.Bank;
    bank.clearTrackList(bank.savedQueueName);
  },

  savedBrowseListName: "__browseList",
  currBrowseList: null,
  saveBrowseList: function(trackList) {
    var bank = Tapedeck.Backend.Bank;
    if (bank.currBrowseList) {
      bank.currBrowseList.unbind('change tracks'); // unbind old change event
    }

    bank.saveTrackList(bank.savedBrowseListName, trackList);
    bank.currBrowseList = trackList;

    bank.currBrowseList.unbind('change tracks'); // make sure the new one doesn't have a change event and add one
    bank.currBrowseList.bind('change tracks', function() {
      Tapedeck.Backend.MessageHandler.pushBrowseTrackList(this);
    });
  },
  getBrowseList: function() {
    var bank = Tapedeck.Backend.Bank;
    if (bank.currBrowseList == null) {
      bank.currBrowseList = bank.getTrackList(bank.savedBrowseListName);
    }
    return bank.currBrowseList;
  },

  clearBrowseList: function() {
    var bank = Tapedeck.Backend.Bank;
    bank.clearTrackList(bank.savedBrowseListName);
    if (bank.currBrowseList) {
      bank.currBrowseList.unbind('change tracks');
      bank.currBrowseList = null;
    }
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
    var oldVal = (this.localStorage.getItem(this.syncKey) == "true");

    this.localStorage.setItem(this.syncKey,
                              (oldVal ? "false" : "true"));
  },

  getRepeat: function() {
    return this.localStorage.getItem(this.repeatKey) == "true";
  },

  getSync: function() {
    return this.localStorage.getItem(this.syncKey) == "true";
  },

  saveVolume: function(volume) {
    this.localStorage.setItem(this.volumeKey, volume);
  },

  getVolume: function() {
    var volume = this.localStorage.getItem(this.volumeKey);
    return ((volume != null) ? volume : 1);
  },
}
