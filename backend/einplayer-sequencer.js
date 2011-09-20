Einplayer.Backend.Sequencer = {
  STATES: { PLAY:   "play",
            PAUSE:  "pause",
            STOP:   "stop",
            LOAD:   "load" },

  currentState: null,
  queue: null,
  init: function() {
    this.currentState = this.STATES.STOP;
    this.queue =  new Einplayer.Backend.Collections.TrackList();
    this.queue.bind("add", this.updateQueueList);
    this.queue.bind("remove", this.updateQueueList);
    this.queue.bind("reset", this.updateQueueList);
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
                              { trackList: Einplayer.Backend.Sequencer.queue });

    queueView.id = "queue-list";
    Einplayer.Backend.MessageHandler.pushView("queue-list",
                                              queueView);
                                              
  },
  
};
