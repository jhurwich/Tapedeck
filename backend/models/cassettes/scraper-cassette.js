Einplayer.Backend.Cassettes.ScraperCassette = Einplayer.Backend.Models.Cassette.extend({

  name: "Scraper",

  // Don't want the interval event
  events: [
    { event  : "pageload",
      do     : "reload" }
  ],

  getBrowseList: function(context) {
    // TODO implement
    /*
    var viewString = $('<div>').append($(context.document).find('head'))
                               .append($(context.document).find('body'))
                               .remove()
                               .html();
    console.log("browse list received : \n" + viewString);
    */
  } 
});
