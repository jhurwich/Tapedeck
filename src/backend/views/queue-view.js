Tapedeck.Backend.Views.Queue = Tapedeck.Backend.Views.TrackList.extend({

  viewName: "Queue",
  id: "queue",
  requiredTemplates: [
    "Queue",
  ],
  proxyEvents: {
    "dragstart #queue .row" : "TrackLists.rowDragStart",
    "dragend #queue .row"   : "TrackLists.rowDragEnd",
    "dragenter #queue .row" : "TrackLists.rowDragEnter",
    "dragleave #queue .row" : "TrackLists.rowDragLeave",
    "dragover #queue .row"  : "TrackLists.rowDragOver",
    "drop #queue .row"      : "TrackLists.rowDrop"
  },
  eventsName: "queueEvents",
  rowDblClick: "queueDblClick",

});
