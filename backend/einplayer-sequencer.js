Einplayer.Backend.Sequencer = {

  queue: null,
  queuePosition: -1, // nothing playing
  savedQueueName: "__queue",
  init: function() {
    if (!this.Player.playerElement) {
      this.Player.init();
    }
    this.queue = Einplayer.Backend.Bank.getTrackList(this.savedQueueName);
    Einplayer.Backend.Bank.saveTracks(this.queue);
    this.queue.bind("add", this.updateQueueList);
    this.queue.bind("remove", this.updateQueueList);
    this.queue.bind("reset", this.updateQueueList);
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
      Einplayer.Backend.Sequencer.setQueuePosition(-1);
    },
    
    pause: function() {
      this.playerElement.get(0).pause();
      this.currentState = this.STATES.PAUSE;
    },

    resume: function() {
      this.playerElement.get(0).play();
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
      Einplayer.Backend.MessageHandler.updatePlayer();
    },

    handlePause: function(self) {
      Einplayer.Backend.MessageHandler.updatePlayer();
    },

    handleEnded: function(self) {
      Einplayer.Backend.Sequencer.next();
      Einplayer.Backend.MessageHandler.updatePlayer();
    },

    handleLoadStart: function(self) {
      self.currentState = self.STATES.LOAD;
      Einplayer.Backend.MessageHandler.updatePlayer();
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
      Einplayer.Backend.MessageHandler.updateSlider();
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
  }, // End Einplayer.Sequencer.Player

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
      this.Player.stop();
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
    this.updateQueueList();
  },
  
  push: function(track) {
    this.insertAt(track, this.queue.length);
  },

  insertAt: function(track, pos) {
    this.insertSomeAt([track], pos);
  },

  insertSomeAt: function(tracks, pos) {
    for (var i = tracks.length - 1; i >= 0 ; i--) {
      var track = tracks[i];
      if (track instanceof Backbone.Model) {
        track = track.clone(); // need to clone to allow duplicates in queue
      }

      this.queue.add(track, { at:pos });
    }
  },

  moveTo: function(trackIndexPair, pos) {
    this.moveSomeTo([trackIndexPair], pos);
  },

  moveSomeTo: function(trackIndexPairs, pos) {
    var sqcr = Einplayer.Backend.Sequencer;
    
    var tracksToRemove = [];
    _.map(trackIndexPairs, function(pair) {
      tracksToRemove.push(sqcr.getAt(pair.index));
    });
    
    var tracks = _.pluck(trackIndexPairs, "track");
    this.insertSomeAt(tracks, pos);

    this.removeSome(tracksToRemove);
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
    this.setQueuePosition(this.queuePosition - posChange);
  },

  clear: function() {
    this.queue.reset();
    this.setQueuePosition(-1);
  },
  
  updateQueueList: function() {
    var sqcr = Einplayer.Backend.Sequencer;
    Einplayer.Backend.Bank.saveTrackList(sqcr.savedQueueName, sqcr.queue);
    
    var queueView = Einplayer.Backend
                             .TemplateManager
                             .renderView
                             ("Queue",
                              { trackList : sqcr.queue });

    Einplayer.Backend.MessageHandler.pushView("queue-list",
                                              queueView);
                                              
  },
  
};
