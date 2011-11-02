Tapedeck.Backend.Views.BrowseList = Tapedeck.Backend.Views.TrackList.extend({

  viewName: "BrowseList",
  id: "browse-list",
  proxyEvents: {
    "dragstart #browse-list .row" : "rowDragStart",
    "dragend #browse-list .row"   : "rowDragEnd",
  },
  eventsName: "browseListEvents",
  rowDblClick: "browseDblClick",
  
});
