Tapedeck.Backend.Views.Queue = Tapedeck.Backend.Views.TrackList.extend({

  viewName: "Queue",
  id: "queue-list",
  proxyEvents: {
    "dragstart #queue-list .row" : "TrackLists.rowDragStart",
    "dragend #queue-list .row"   : "TrackLists.rowDragEnd",
    "dragenter #queue-list .row" : "TrackLists.rowDragEnter",
    "dragleave #queue-list .row" : "TrackLists.rowDragLeave",
    "dragover #queue-list .row"  : "TrackLists.rowDragOver",
    "drop #queue-list .row"      : "TrackLists.rowDrop"
  },
  eventsName: "queueEvents",
  rowDblClick: "queueDblClick",

});
