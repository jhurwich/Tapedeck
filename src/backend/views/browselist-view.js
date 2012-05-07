Tapedeck.Backend.Views.BrowseList = Tapedeck.Backend.Views.TrackList.extend({

  viewName: "BrowseList",
  id: "browse-list",
  requiredTemplates: [
    "BrowseList",
  ],
  proxyEvents: {
    "dragstart #browse-list .row" : "TrackLists.rowDragStart",
    "dragend #browse-list .row"   : "TrackLists.rowDragEnd",
  },
  eventsName: "browseListEvents",
  rowDblClick: "browseDblClick",

});
