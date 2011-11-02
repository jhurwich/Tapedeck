Tapedeck.Backend.Sequencer = {

  queue: null,
  queuePosition: -1, // nothing playing
  savedQueueName: "__queue",
  init: function() {
    if (!this.Player.playerElement) {
      this.Player.init();
    }
    var bank = Tapedeck.Backend.Bank
    this.queue = bank.getTrackList(this.savedQueueName);
    bank.saveTracks(this.queue);

    var volume = bank.getVolume();
    this.Player.setVolume(volume);
  },

  Player: {
    STATES: { PLAY:   "play",
              PAUSE:  "pause",
              STOP:   "stop",
              LOAD:   "load" },
    currentState: null,
    
    currentTrack: null,
    playerElement: null,
    init: function() {
      this.playerElement = $("#audioplayer").first();
      this.currentState = this.STATES.STOP;
      
      $(this.playerElement).bind("playing", this.handlePlaying.curry(this));
      $(this.playerElement).bind("pause", this.handlePause.curry(this));
      $(this.playerElement).bind("ended", this.handleEnded.curry(this));
      $(this.playerElement).bind("loadstart", this.handleLoadStart.curry(this));
      $(this.playerElement).bind("durationchange", this.handleDurationChange.curry(this));
      $(this.playerElement).bind("timeupdate", this.handleTimeUpdate.curry(this));
    },

    play: function(track) {
      this.currentTrack = track;
      $(this.playerElement).attr("src", track.get("url"));
      this.playerElement.get(0).load();
      this.playerElement.get(0).play();
    },

    stop: function() {
      this.playerElement.get(0).pause();
      $(this.playerElement).removeAttr("src");
      
      this.currentState = this.STATES.STOP;
      Tapedeck.Backend.Sequencer.setQueuePosition(-1);
    },
    
    pause: function() {
      this.playerElement.get(0).pause();
      this.currentState = this.STATES.PAUSE;
    },

    resume: function() {
      this.playerElement.get(0).play();
    },

    setVolume: function(percent) {
      this.playerElement.get(0).volume = percent;
    },
    
    getVolume: function() {
      return this.playerElement.get(0).volume;
    },

    seek: function(time) {
      if (this.playerElement.get(0).duration < time) {
        console.error("Attempted seek out of bounds");
        return;
      }
      try {
        this.playerElement.get(0).currentTime = time;
      } catch (err) {
        
        if (err.name == "INVALID_STATE_ERR") {
          console.error("No resource currently playing to seek");
        } else {
          console.error("Unknown error attempting to seek");
        }
      }
    },

    seekPercent: function(percent) {
      var time = percent * this.playerElement.get(0).duration;
      this.seek(time);
    },
    
    handlePlaying: function(self) {
      self.currentState = self.STATES.PLAY;
      Tapedeck.Backend.MessageHandler.updatePlayer();
    },

    handlePause: function(self) {
      Tapedeck.Backend.MessageHandler.updatePlayer();
    },

    handleEnded: function(self) {
      Tapedeck.Backend.Sequencer.next();
      Tapedeck.Backend.MessageHandler.updatePlayer();
    },

    handleLoadStart: function(self) {
      self.currentState = self.STATES.LOAD;
      Tapedeck.Backend.MessageHandler.updatePlayer();
    },
    
    handleDurationChange: function(self) {
      var duration = self.playerElement.get(0).duration;
      self.currentTrack.set({ duration : duration },
                            { silent   : true     });
    },

    handleTimeUpdate: function(self) {
      var currentTime = self.playerElement.get(0).currentTime;
      self.currentTrack.set({ currentTime : currentTime},
                            { silent      : true       });
      Tapedeck.Backend.MessageHandler.updateSeekSlider();
    },
    
    // Error Codes from http://www.w3.org/TR/html5/video.html#htmlmediaelement
    dumpErrors: function() {
      var err = this.playerElement.get(0).error;
      if (!err) {
        console.log("Player has reported no errors");
        return;
      }
      var lastError = "";
      switch (err.code) {
        case 1:
          lastError = "Aborted";
          break;
        case 2:
          lastError = "Network Error";
          break;
        case 3:
          lastError = "Decode Error";
          break;
        case 4:
          lastError = "Src Not Supported";
          break;
        default:
          lastError = "Unrecognized MediaError code";
          break;
      }

      var networkState = "";
      switch(this.playerElement.get(0).networkState) {
        case 0:
          networkState = "Empty";
          break;
        case 1:
          networkState = "Idle";
          break;
        case 2:
          networkState = "Loading";
          break;
        case 3:
          networkState = "No Source";
          break;
        default:
          networkState = "Unrecognized Network State";
          break;
      }
      console.log("Player reported last error as '" + lastError +
                  "' and the network state as '" + networkState + "'");
    },
  }, // End Tapedeck.Sequencer.Player

  getCurrentState: function() {
    return this.Player.currentState;
  },
  getCurrentTrack: function() {
    return this.Player.currentTrack;
  },
  
  playIndex: function(index) {
    var track = this.getAt(index);
    this.setQueuePosition(index);
    this.Player.play(track);
  },
  
  playNow: function() {
    var state = this.getCurrentState();
    if (state == "pause") {
      this.Player.resume();
    }
    else if (state == "stop") {
      this.playIndex(this.queuePosition + 1);
    }
  },

  pause: function() {
    this.Player.pause();
  },

  next: function() {
    if (this.queuePosition < this.queue.length - 1) {
      this.playIndex(this.queuePosition + 1);
    }
    else {
      if (Tapedeck.Backend.Bank.getRepeat() &&
          this.queue.length > 0) {
        this.playIndex(0);
      }
      else {
        this.Player.stop();
      }
    }
  },

  prev: function() {
    var state = this.getCurrentState();
    var currentTime = this.getCurrentTrack().get("currentTime");
    if (state == "play" && currentTime > 2) {
      this.Player.seek(0);
    }
    else {
      this.playIndex(this.queuePosition - 1);
    }
  },

  getAt: function(pos) {
    return this.queue.at(pos);
  },

  getQueuedTrack: function(trackID) {
    var trackArr = this.queue.select(function(track) {
      return track.get("tdID") == trackID;
    });
    var track = null;
    if (trackArr.length > 0) {
      track = trackArr[0];
    }

    return track;
  },

  setQueuePosition: function(pos) {
    this.queuePosition = pos;
    var count = pos + 1; // listenedCount = queuePosition, + 1 playing
    
    this.queue.each(function(track) {
      count--;
      if (count < 0) {
        track.unset("listened", {silent : true});
        track.unset("playing", {silent : true});
        return track;
      }
      else if (count > 0) {
        track.unset("playing", {silent : true});
        return track.set({listened: true },
                         {silent  : true });
      }
      else {
        track.unset("listened", {silent : true});
        return track.set({playing: true },
                         {silent  : true });
      }
    });
    this.queue.trigger("change tracks");
  },
  
  push: function(track, silent) {
    this.insertAt(track, this.queue.length, silent);
  },

  insertAt: function(track, pos, silent) {
    this.insertSomeAt([track], pos, silent);
  },

  insertSomeAt: function(tracks, pos, silent) {
    if (typeof(silent) == "undefined") {
      silent = false;
    }
    
    for (var i = tracks.length - 1; i >= 0 ; i--) {
      var track = tracks[i];
      if (track instanceof Backbone.Model) {
        track = track.clone(); // need to clone to allow duplicates in queue
      }

      var options = { at : pos,
                      silent: silent };

      this.queue.add(track, options);
    }
    this.saveQueue();

    if (pos <= this.queuePosition) {
      this.setQueuePosition(this.queuePosition + tracks.length);
    }
  },

  moveTo: function(trackIndexPair, pos) {
    this.moveSomeTo([trackIndexPair], pos);
  },

  moveSomeTo: function(trackIndexPairs, pos) {
    var sqcr = Tapedeck.Backend.Sequencer;
    
    var tracksToRemove = [];
    var playingIndex = -1;
    _.map(trackIndexPairs, function(pair) {
      var index = parseInt(pair.index);
      if (index == sqcr.queuePosition) {
        // we are attempting to move the playing track, record its index
        playingIndex = tracksToRemove.length;
      }
      
      tracksToRemove.push(sqcr.getAt(index));
    });
    
    var tracks = _.pluck(trackIndexPairs, "track");
    this.insertSomeAt(tracks, pos, true);

    if (playingIndex >= 0) {
      this.setQueuePosition(pos + playingIndex);
    }

    this.removeSome(tracksToRemove);
    this.saveQueue();
  },

  remove: function(trackModel) {
    this.removeSome([trackModel]);
  },
  
  removeAt: function(pos) {
    var toRemove = this.getAt(pos);
    if (toRemove.get("playing")) {
      this.next();
    }
    this.remove(toRemove);
    this.saveQueue();
    return toRemove;
  },

  removeSome: function(trackModels) {
    var posChange = 0;
    for (var i = 0; i < trackModels.length; i++) {
       var index = this.queue.indexOf(trackModels[i]);
       if (index < this.queuePosition) {
         posChange++;
       }
    }
    this.queue.remove(trackModels);
    this.saveQueue();
    
    this.setQueuePosition(this.queuePosition - posChange);
  },

  shuffle: function() {
    var originalOrderPairs = [];
    for (var i = 0; i < this.queue.length; i++) {
      var track = this.getAt(i);
      originalOrderPairs.push({ track: track, index: i });
    }

    var newOrderPairs = [];
    // if a track is playing, it will be first in the new order
    if (this.queuePosition > -1) {
      newOrderPairs.push(originalOrderPairs[this.queuePosition]);
      originalOrderPairs.splice(this.queuePosition, 1);
    }
    
    while(originalOrderPairs.length > 0) {
      // randomly pick an index
      var rand = Math.floor(Math.random() * originalOrderPairs.length);
      var pair = originalOrderPairs[rand];

      newOrderPairs.push(pair);

      // remove that index so we can't get it again (no dups)
      originalOrderPairs.splice(rand, 1);
    }
    this.moveSomeTo(newOrderPairs, 0);
  },

  clear: function() {
    this.queue.reset();
    this.saveQueue();
    
    this.setQueuePosition(-1);
  },

  playPlaylist: function(playlist) {
    this.clear();
    this.insertSomeAt(playlist.models, 0);
  },

  saveQueue: function() {
    var sqcr = Tapedeck.Backend.Sequencer;
    Tapedeck.Backend.Bank.saveTrackList(sqcr.savedQueueName, sqcr.queue);
  }
};