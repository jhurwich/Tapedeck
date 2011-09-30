Einplayer.Backend.Sequencer = {

  queue: null,
  queuePosition: -1, // nothing playing
  init: function() {
    if (!this.Player.playerElement) {
      this.Player.init();
    }
    this.queue =  new Einplayer.Backend.Collections.TrackList();
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
      
      $(this.playerElement).bind("play", this.handlePlay.curry(this));
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
    
    pause: function() {
      this.playerElement.get(0).pause();
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

    handlePlay: function(self) {
      console.log("play");
      self.currentState = self.STATES.PLAY;
      Einplayer.Backend.MessageHandler.updatePlayer();
    },
    
    handlePlaying: function(self) {
      console.log("playing");
      self.currentState = self.STATES.PLAY;
      Einplayer.Backend.MessageHandler.updatePlayer();
    },

    handlePause: function(self) {
      console.log("pause event");
      self.currentState = self.STATES.PAUSE;
      Einplayer.Backend.MessageHandler.updatePlayer();
    },

    handleEnded: function(self) {
      console.log("ended event");
      self.currentState = self.STATES.STOP;
      Einplayer.Backend.MessageHandler.updatePlayer();
    },

    handleLoadStart: function(self) {
      console.log("load start");
      self.currentState = self.STATES.LOAD;
      Einplayer.Backend.MessageHandler.updatePlayer();
    },
    
    handleDurationChange: function(self) {
      console.log("duration change event");
      var duration = self.playerElement.get(0).duration;
      self.currentTrack.set({ duration : duration },
                            { silent   : true     });
    },

    handleTimeUpdate: function(self) {
      var currentTime = self.playerElement.get(0).currentTime;
      self.currentTrack.set({ currentTime : currentTime},
                            { silent      : true       });
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
  
  playTrack: function(track) {
    var index = this.getIndex(track);
    this.setQueuePosition(index);
    this.Player.play(track);
  },
  
  playNow: function() {
    var state = this.getCurrentState();
    if (state == "pause") {
      this.Player.resume();
    }
    else if (state == "stop") {
      var nextTrack = this.getNext();
      this.playTrack(nextTrack);
    }
  },

  pause: function() {
    this.Player.pause();
  },

  next: function() {
    var nextTrack = this.getNext();
    this.playTrack(nextTrack);
  },

  prev: function() {
    var state = this.getCurrentState();
    var currentTime = this.getCurrentTrack().get("currentTime");
    console.log("currTime:"+ currentTime);
    if (state == "play" && currentTime > 2) {
      this.Player.seek(0);
    }
    else {
      var prevTrack = this.getAt(this.queuePosition - 1);
      this.playTrack(prevTrack);
    }
  },

  getIndex: function(track) {
    return this.queue.indexOf(track);
  },
  getAt: function(pos) {
    return this.queue.at(pos);
  },
  getNext: function() {
    return this.getAt(this.queuePosition +1);
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
    this.queue.add(track);
  },

  insertAt: function(track, pos) {
    this.queue.add(track, { at: pos });
  },

  insertSomeAt: function(tracks, pos) {
    for (var i = tracks.length - 1; i >= 0 ; i--) {
      this.queue.add(tracks[i], { at:pos });
    }
  },
  
  remove: function(pos) {
    var toRemove = this.getAt(pos);
    this.queue.remove(toRemove);
    return toRemove;
  },

  clear: function() {
    this.queue.reset();
  },
  
  updateQueueList: function() {
    var queueView = Einplayer.Backend
                             .TemplateManager
                             .renderView
                             ("TrackList",
                              { trackList: Einplayer.Backend.Sequencer.queue,
                                rowDblClick: "queueDblClick" });

    queueView.id = "queue-list";
    Einplayer.Backend.MessageHandler.pushView("queue-list",
                                              queueView);
                                              
  },
  
};
