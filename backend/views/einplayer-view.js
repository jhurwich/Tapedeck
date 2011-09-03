Einplayer.Backend.Views.Player = Backbone.View.extend({

  tagName: "div",
  className: "player",
  requiredTemplates: [
    "Player",
  ],
  template: null,

  initialize: function() {
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("Player"));
  },

  demoTrackJSONs: [
    {
      trackName   : "Beards Again",
      artistName  : "MSTRKRFT",
      cassette    : "The Burning Ear",
      src         : "http://www.theburningear.com/media/2011/03/MSTRKRFT-BEARDS-AGAIN.mp3",      
    },
    {
      trackName   : "Animal Parade",
      artistName  : "Buily By Animals",
      cassette    : "The Burning Ear",
      src         : "http://www.theburningear.com/media/2011/03/Built-By-Animals-Animal-Parade.mp3",
    },
    {
      trackName   : "Rad Racer",
      artistName  : "Work Drugs",
      cassette    : "The Burning Ear",
      src         : "http://www.theburningear.com/media/2011/03/Work-Drugs-Rad-Racer-Final.mp3",
    }
  ],

  render: function() {
    this.el.innerHTML =  this.template({ });
       
    var queueTrackList = new Einplayer.Backend.Collections.TrackList
                                              (this.demoTrackJSONs);

    var queueView = Einplayer.Backend
                             .TemplateManager
                             .renderView("TrackList",
                                         { trackList: queueTrackList });
                                         
    var queueListID = "queue-list";
    queueView.id = queueListID;
    $(this.el).find("#" + queueListID).replaceWith(queueView);

    var cassetteMgr = Einplayer.Backend.CassetteManager;

    var loadCassettesAndBrowse = function(context) {
      browseTrackJSONs = "";
      if (cassetteMgr.currentCassette) {
        browseTrackJSONs = cassetteMgr.currentCassette
                                      .getBrowseList(context);
      }
      else {
        // TODO show CassetteList in front
      }
      var browseTrackList = new Einplayer.Backend.Collections.TrackList
                                                 (browseTrackJSONs);
  
      var browseView = Einplayer.Backend
                                .TemplateManager
                                .renderView("TrackList",
                                            { trackList: browseTrackList });
                                           
      var browseListID = "browse-list";
      browseView.id = browseListID;
      $(this.el).find("#" + browseListID).replaceWith(browseView);
    }
    
    Einplayer.Backend.Utils.getContext(loadCassettesAndBrowse);
    
    return this.el;
  },
});
