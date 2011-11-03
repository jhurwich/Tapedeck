Tapedeck.Backend.Views.Queue = Tapedeck.Backend.Views.TrackList.extend({

  viewName: "Queue",
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