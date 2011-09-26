Einplayer.Backend.Sequencer = {
  STATES: { PLAY:   "play",
            PAUSE:  "pause",
            STOP:   "stop",
            LOAD:   "load" },

  currentState: null,
  queue: null,
  init: function() {
    if (!this.Player.playerElement) {
      this.Player.init();
    }
    this.currentState = this.STATES.STOP;
    this.queue =  new Einplayer.Backend.Collections.TrackList();
    this.queue.bind("add", this.updateQueueList);
    this.queue.bind("remove", this.updateQueueList);
    this.queue.bind("reset", this.updateQueueList);
  },

  Player: {
    playerElement: null,
    init: function() {
      this.playerElement = $("#player").first();
      $(this.playerElement).bind("play", this.handlePlay);
      $(this.playerElement).bind("pause", this.handlePause);
      $(this.playerElement).bind("ended", this.handleEnded);
      $(this.playerElement).bind("canplay", this.handleCanPlay);
      $(this.playerElement).bind("canplaythrough", this.handleCanPlayThrough);
    },

    play: function() {
      this.playerElement.get(0).play();
    },
    
    pause: function() {
      this.playerElement.get(0).pause();
    },

    setSrc: function(src) {
      $(this.playerElement).attr("src", src);
      this.playerElement.get(0).load();
    },

    handlePlay: function() {
      console.log("play event");
    },

    handlePause: function() {
      console.log("pause event");
    },

    handleEnded: function() {
      console.log("ended event");
    },
    
    handleCanPlay: function() {
      console.log("canplay event");
    },
    
    handleCanPlayThrough: function() {
      console.log("canplaythrough event");
    },


    // Codes from http://www.w3.org/TR/html5/video.html#htmlmediaelement
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

  
  play: function(track) {
    this.Player.setSrc(track.get("url"));
    this.Player.play();
  },

  getAt: function(pos) {
    return this.queue.at(pos);
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
