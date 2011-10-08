Einplayer.Backend.Views.BrowseList = Einplayer.Backend.Views.TrackList.extend({

  id: "browse-list",
  proxyEvents: {
    "dragstart #browse-list .row" : "rowDragStart",
    "dragend #browse-list .row"   : "rowDragEnd",
  },
  eventsName: "browseListEvents",
  rowDblClick: "browseDblClick",
  
});
