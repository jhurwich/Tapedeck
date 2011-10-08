Einplayer.Backend.Views.Queue = Einplayer.Backend.Views.TrackList.extend({

  id: "queue-list",
  proxyEvents: {
    "dragstart #queue-list .row" : "rowDragStart",
    "dragend #queue-list .row"   : "rowDragEnd",
    "dragenter #queue-list .row" : "rowDragEnter",
    "dragleave #queue-list .row" : "rowDragLeave",
    "dragover #queue-list .row"  : "rowDragOver",
    "drop #queue-list .row"      : "rowDrop"
  },
  eventsName: "queueEvents",
  rowDblClick: "queueDblClick",

});
