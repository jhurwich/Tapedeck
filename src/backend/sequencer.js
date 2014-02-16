Tapedeck.Backend.Sequencer = {

  queue: null,
  queuePosition: -1, // nothing playing
  init: function() {
    var sqcr = Tapedeck.Backend.Sequencer;
    chrome.commands.onCommand.addListener(sqcr.keyListener);

    if (!sqcr.Player.playerElement) {
      sqcr.Player.init();
    }

    sqcr.prepareQueue(function() {

    });
  },

  keyListener: function(command) {
    var sqcr = Tapedeck.Backend.Sequencer;

    switch(command) {
    case "next_track":
      sqcr.next();
      break;

    case "delete_track":
      sqcr.remove(sqcr.Player.currentTrack);
      break;

    case "prev_track":
      sqcr.prev();
      break;

    case "play_pause":
      sqcr.togglePlay();
      break;

    default:
      throw new Error("Unknown key command: " + command);
    }
  },

  // forcedQueue is an optional trackList that will be used instead of the bank's
  prepareQueue: function(forcedQueue, callback) {
    if (arguments.length == 1) {
      callback = forcedQueue;
      forcedQueue = null;
    }
    var bank = Tapedeck.Backend.Bank;
    var sqcr = Tapedeck.Backend.Sequencer;

    var setQueue = function(queue) {
      sqcr.queue = queue;
      sqcr.log("New Queue Prepared:  " + sqcr.queue.length + " tracks");

      // recover metadata like the queuePosition
      bank.Sync.recoverMetadata(function() {

        var updateQueue = function(eventName) {
          // we only care about the greater 'change' event.  The "change:__" events are ignored.
          if (eventName.indexOf("change:") == -1) {
            sqcr.log("Rendering and pushing queue and player", Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);
            Tapedeck.Backend.TemplateManager.renderViewAndPush("Queue", "all"); //send queue changes to all tabs
            Tapedeck.Backend.TemplateManager.renderViewAndPush("Player", "all"); //send player changes to all tabs
          }
        };
        sqcr.queue.destination = "Queue"; // set this so we handle the tracklist differently in templates
        sqcr.queue.bind('all', updateQueue);
        sqcr.queue.bind('set position', bank.sync);
        callback();
      });
    };

    if (forcedQueue != null) {
      setQueue(forcedQueue);
    }
    else {
      bank.getQueue(setQueue);
    }
  },

  Player: {
    isPrefetching: true,
    prefetchComplete: false,

    playAfterLoading: false,
    seekAfterLoading: 0,

    STATES: { PLAY:   "play",
              READY:  "ready",
              PAUSE:  "pause",
              STOP:   "stop",
              LOAD:   "load" },

    playerID: "#audioplayer1",
    prefetchID: "#audioplayer2",

    playerElement: null,
    prefetchElement: null,

    currentState: null,
    currentTrack: null,

    init: function() {
      this.playerElement = $(this.playerID).first();
      this.prefetchElement = $(this.prefetchID).first();
      this.currentState = this.STATES.STOP;

      var volume = Tapedeck.Backend.Bank.getVolume();
      this.setVolume(volume);

      this.attachEvents();
    },

    attachEvents: function() {
      $(this.playerElement).bind("error", this.handleError.curry(this));
      $(this.playerElement).bind("playing", this.handlePlaying.curry(this));
      $(this.playerElement).bind("pause", this.handlePause.curry(this));
      $(this.playerElement).bind("ended", this.handleEnded.curry(this));
      $(this.playerElement).bind("loadstart", this.handleLoadStart.curry(this));
      $(this.playerElement).bind("canplay", this.handleCanPlay.curry(this));
      $(this.playerElement).bind("canplaythrough", this.handleCanPlayThrough.curry(this));
      $(this.playerElement).bind("durationchange", this.handleDurationChange.curry(this));
      $(this.playerElement).bind("timeupdate", this.handleTimeUpdate.curry(this));

      $(this.prefetchElement).bind("error", this.prefetchHandleError.curry(this));
      $(this.prefetchElement).bind("canplaythrough", this.prefetchHandleCanPlayThrough.curry(this));
    },

    detachEvents: function() {
      $(this.playerElement).unbind();
      $(this.prefetchElement).unbind();
    },

    play: function() {
      var sqcr = Tapedeck.Backend.Sequencer;
      var bank = Tapedeck.Backend.Bank;
      var currentTrack = sqcr.getCurrentTrack();

      sqcr.log("-Play-");
      if (bank.isSpeechOn()) {
        // say track information
        Tapedeck.Backend.Utils.speekTrack(currentTrack, function() {
          sqcr.Player.playerElement.get(0).play();
        });
      }
      else {
        this.playerElement.get(0).play();
      }
    },

    stop: function() {
      Tapedeck.Backend.Sequencer.log("-Stop-");
      this.playerElement.get(0).pause();
      $(this.playerElement).removeAttr("src");

      this.currentState = this.STATES.STOP;
      Tapedeck.Backend.Sequencer.setQueuePosition(-1);
    },

    pause: function() {
      Tapedeck.Backend.Sequencer.log("-Pause-");
      this.playerElement.get(0).pause();
      this.currentState = this.STATES.PAUSE;
    },

    resume: function() {
      Tapedeck.Backend.Sequencer.log("-Resume-");
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
        Tapedeck.Backend.Sequencer.log("Seek to " + time);
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

    // choose another track to load, clears any prefetching in progress
    loadTrack: function(track) {
      this.currentTrack = track;
      this.currentTrack.set({ currentTime: 0 });

      // the prefetchElement contains the old player if this track was prefetched,
      // either way blank the prefetchElement then we'll play or load with the playerElement
      var wasPrefetched = this.prefetchComplete;
      if (this.isPrefetching || this.prefetchComplete) {
        this.prefetchComplete = false;
        this.isPrefetching = false;
      }

      // if the track is already in the player, it was prefetched.  Go ahead and play it
      if ($(this.playerElement).attr("src") == this.currentTrack.get("url") &&
          wasPrefetched) {
        Tapedeck.Backend.Sequencer.log("Playing prefetched track '" + track.get("trackName") + "'");
        this.prefetchComplete = false;
        this.isPrefetching = false;
        this.play();
        return;
      }

      Tapedeck.Backend.Sequencer.log("Loading new track '" + track.get("trackName") + "'");

      $(this.playerElement).attr("src", this.currentTrack.get("url"));
      if (typeof(this.currentTrack.get("url")) == "undefined" ||
          this.currentTrack.get("url") === "") {
        console.error("A Track has no url: " + JSON.stringify(track.toJSON()));
      }
      this.playerElement.get(0).load();
    },

    prefetch: function() {
      var sqcr = Tapedeck.Backend.Sequencer;
      this.isPrefetching = true;
      this.prefetchComplete = false;

      // wrap if repeat is on, do nothing otherwise
      var nextPos = sqcr.getQueuePosition()+ 1;
      if (nextPos >= sqcr.queue.length) {
        if (Tapedeck.Backend.Bank.getRepeat()) {
          nextPos = 0;
        }
        else {
          return;
        }
      }
      var track = sqcr.getAt(nextPos);

      sqcr.log("Prefetching new track '" + track.get("trackName") + "'");

      $(this.prefetchElement).attr("src", track.get("url"));
      if (typeof(track.get("url")) == "undefined" ||
          track.get("url") === "") {
        console.error("B Track has no url: " + JSON.stringify(track.toJSON()));
      }
      this.prefetchElement.get(0).load();
    },

    playerSwap: function() {
      Tapedeck.Backend.Sequencer.log("Switching to prefetched player");
      this.detachEvents();

      var saved = this.playerID;
      this.playerID = this.prefetchID;
      this.prefetchID = saved;

      this.init();
    },

    handleError: function(self) {
      var cMgr = Tapedeck.Backend.CassetteManager;
      var sqcr = Tapedeck.Backend.Sequencer;
      self.dumpErrors();

      if (cMgr.hasErrorHandler(self.currentTrack.get("cassette"))) {
        var currentTime = self.getCurrentTime();
        cMgr.doErrorHandler(self.currentTrack, function(updatedTrack) {
          // successCallback
          var oldPos = sqcr.queuePosition;
          sqcr.log("Error handled successfully, replacing track at " + oldPos + " and starting again.");

          sqcr.remove(self.currentTrack);
          sqcr.insertAt(updatedTrack, oldPos, true);
          sqcr.playIndex(oldPos, currentTime);

        }, function(error) {
          // errorCallback - could not fix the track
          console.error("Could not handle error for track: " + self.currentTrack.get("trackName") +
                        "-" + self.currentTrack.get("url"));
          self.currentTrack.set({ error: true });
          sqcr.next();
        });
      }
      else {
        console.error("Could not handle error for track: " + self.currentTrack.get("trackName") +
                        "-" + self.currentTrack.get("url"));
        self.currentTrack.set({ error: true });
        sqcr.next();
      }
    },
    prefetchHandleError: function(self) {
      var sqcr = Tapedeck.Backend.Sequencer;
      this.prefetchComplete = false;
      this.isPrefetching = false;
      self.dumpErrors(sqcr.prefetchID);
    },
    // errorObj is optional
    simulateError: function(delay, errorObj) {
      var sqcr = Tapedeck.Backend.Sequencer;
      if (typeof(errorObj) == "undefined") {
        errorObj = { code: 2, networkState: "Empty" };
      }
      console.error("- - - - - - - - - - Simulating Error in " + delay + "ms - - - - - - - - - -");

      var event = new CustomEvent("error", errorObj);
      if (delay <= 0) {
        sqcr.Player.playerElement.get(0).dispatchEvent(event);
      }
      else {
        setTimeout(function() {
          sqcr.Player.playerElement.get(0).dispatchEvent(event);
        }, delay);
      }
    },

    handlePlaying: function(self) {
      self.currentState = self.STATES.PLAY;
      Tapedeck.Backend.TemplateManager.renderViewAndPush("Player");
      Tapedeck.Backend.TemplateManager.renderViewAndPush("Onscreen");
    },

    handlePause: function(self) {
      Tapedeck.Backend.TemplateManager.renderViewAndPush("Player");
      Tapedeck.Backend.TemplateManager.renderViewAndPush("Onscreen");
    },

    handleEnded: function(self) {
      Tapedeck.Backend.Sequencer.log("Track ended, next please.");
      clearTimeout(self.endedCheck);

      if (self.prefetchComplete) {
        self.playerSwap();
      }
      Tapedeck.Backend.Sequencer.next();
    },

    handleLoadStart: function(self) {
      Tapedeck.Backend.Sequencer.log("Track loading...");
      self.currentState = self.STATES.LOAD;
      Tapedeck.Backend.TemplateManager.renderViewAndPush("Player");
    },

    handleCanPlay: function(self) {
      Tapedeck.Backend.Sequencer.log("CanPlay track.");
      self.currentState = self.STATES.READY;
      Tapedeck.Backend.TemplateManager.renderViewAndPush("Player");
    },

    handleCanPlayThrough: function(self) {
      Tapedeck.Backend.Sequencer.log("CanPlayThrough track.");
      if (self.seekAfterLoading > 0) {
        self.playerElement.get(0).currentTime = self.seekAfterLoading;
        self.seekAfterLoading = 0;
      }
      if (self.playAfterLoading) {
        self.play();
        self.playAfterLoading = false;
      }
    },

    prefetchHandleCanPlayThrough: function(self) {
      self.prefetchComplete = true;
      self.isPrefetching = false;
      Tapedeck.Backend.Sequencer.log("Prefetch Complete.");
    },

    getDuration: function() {
      if(isNaN(this.playerElement.get(0).duration)) {
        return null;
      }
      else {
        return this.playerElement.get(0).duration;
      }
    },

    getCurrentTime: function() {
      return this.playerElement.get(0).currentTime;
    },

    handleDurationChange: function(self) {
      var duration = self.playerElement.get(0).duration;
      Tapedeck.Backend.Sequencer.log("Duration update '" + duration + "'...");
      self.currentTrack.set({ duration : duration },
                            { silent   : true     });
    },

    handleTimeUpdate: function(self) {
      var currentTime = parseInt(self.playerElement.get(0).currentTime, 10);
      self.currentTrack.set({ currentTime : currentTime},
                            { silent      : true       });

      var duration = parseInt(self.playerElement.get(0).duration, 10);

      var percent = 0;
      if (duration && currentTime) {

        // start prefetching if we're 90% through the song, have more than 10sec before this track ends,
        // and aren't > 95% through it (wonkiness happens if you jump to the end of a track)
        percent = currentTime / duration;
        if (percent > 0.9 &&
            percent <= 0.95 &&
            percent * duration > 10 &&
            !self.isPrefetching &&
            !self.prefetchComplete) {
          self.prefetch();
        }
      }

      Tapedeck.Backend.MessageHandler.updateSeekSlider();

      // sometimes the "ended" event isn't triggered.  If the track hangs we force the ended event here
      clearTimeout(self.endedCheck);
      if (self.currentState == "play" && percent >= 0.95) {
        var hungTrackName = self.currentTrack.get("trackName");
        self.endedCheck = setTimeout(function() {

          // make sure the same track is still playing, if so trigger the ended
          if (self.currentState == "play" && self.currentTrack.get("trackName") == hungTrackName) {
            console.error("'Ended' was not sent by the audioplayer, triggering manually.");
            self.playerElement.trigger("ended");
          }
        }, 2000);
      }

    },

    // Error Codes from http://www.w3.org/TR/html5/video.html#htmlmediaelement
    // elementID is optional
    dumpErrors: function(elementID) {
      if (typeof(elementID) == "undefined") {
        elementID = this.playerID;
      }
      var element = $(elementID).first();

      var err = element.get(0).error;
      if (!err) {
        console.error(elementID + " has reported no errors in dumpErrors.");
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
      switch(element.get(0).networkState) {
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
      console.error(elementID + " reported last error as '" + lastError +
                    "' and the network state as '" + networkState + "'");
    }
  }, // End Tapedeck.Sequencer.Player

  getCurrentState: function() {
    return this.Player.currentState;
  },
  getCurrentTrack: function() {
    return this.Player.currentTrack;
  },
  getDuration: function() {
    return this.Player.getDuration();
  },
  getCurrentTime: function() {
    return this.Player.getCurrentTime();
  },
  getVolume: function() {
    return this.Player.getVolume();
  },

  // seekTo is optional, specifying a time to seek to after loading the file at the index specified
  playIndex: function(index, seekTo) {
    if (typeof(seekTo) != "undefined") {
      this.Player.seekAfterLoading = seekTo;
    }
    this.Player.playAfterLoading = true;
    this.setQueuePosition(index);
  },

  playNow: function() {
    var state = this.getCurrentState();
    if (state == this.Player.STATES.PAUSE) {
      this.Player.resume();
    }
    else if (state == this.Player.STATES.STOP) {
      this.playIndex(this.queuePosition + 1);
    }
    else if (state == this.Player.STATES.READY) {
      this.Player.play();
    }
  },

  pause: function() {
    this.Player.pause();
  },

  togglePlay: function() {
    var sqcr = Tapedeck.Backend.Sequencer;
    var state = sqcr.getCurrentState();
    if (state == "play") {
      sqcr.pause();
    } else {
      sqcr.playNow();
    }
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

  setQueuePosition: function(pos, noLoad) {
    if (this.queuePosition == pos) {
      // no op
      return;
    }

    if (typeof(noLoad) == "undefined") {
      noLoad = false;
    }

    Tapedeck.Backend.Sequencer.log("Setting queue position '" + pos + "'.");
    this.queuePosition = pos;
    if (this.queuePosition != -1  && !noLoad) {
      var track = this.getAt(this.queuePosition);

      if (track) {

        // skip tracks that are broken
        if (track.get("error")) {
          this.setQueuePosition(pos + 1, noLoad);
          return;
        }
        this.Player.loadTrack(track);
      }
    }
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
    Tapedeck.Backend.Bank.Sync.dirtyMetadata = true;

    this.queue.trigger("set position");
  },

  getQueuePosition: function() {
    return this.queuePosition;
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
                      silent: true };

      this.queue.add(track, options);
    }
    if (!silent) {
      this.queue.trigger("add");
    }

    if (pos <= this.queuePosition) {
      this.setQueuePosition(this.queuePosition + tracks.length, true);
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
      var index = parseInt(pair.index, 10);
      if (index == sqcr.queuePosition) {
        // we are attempting to move the playing track, record its index
        playingIndex = tracksToRemove.length;
      }

      tracksToRemove.push(sqcr.getAt(index));
    });

    var tracks = _.pluck(trackIndexPairs, "track");
    this.insertSomeAt(tracks, pos, true);

    if (playingIndex >= 0) {
      this.setQueuePosition(pos + playingIndex, true);
    }

    this.removeSome(tracksToRemove);
  },

  remove: function(trackModel) {
    this.removeSome([trackModel]);
  },

  removeAt: function(pos) {
    var toRemove = this.getAt(pos);
    this.remove(toRemove);
    return toRemove;
  },

  removeSome: function(trackModels) {
    var posChange = 0;
    var wasPlaying = false;
    for (var i = 0; i < trackModels.length; i++) {
      if (trackModels[i].get("playing")) {
        wasPlaying = true;
      }

      var index = this.queue.indexOf(trackModels[i]);
      if (index < this.queuePosition) {
        posChange++;
      }
    }
    if (wasPlaying) {
      this.next();
    }
    this.queue.remove(trackModels);

    this.setQueuePosition(this.queuePosition - posChange, true);
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

  clear: function(callback) {
    var bank = Tapedeck.Backend.Bank;
    Tapedeck.Backend.Bank.clearList(this.queue);
    this.queue.reset();

    this.setQueuePosition(-1);
    if (typeof(callback) != "undefined") {
      callback();
    }
  },

  playPlaylist: function(playlist) {
    this.clear();
    this.insertSomeAt(playlist.models, 0);
  },


  log: function(str, level) {
    Tapedeck.Backend.Utils.log("Sequencer", str, level);
  }
};
