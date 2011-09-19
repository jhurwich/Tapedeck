Einplayer.Backend.Views.Player = Backbone.View.extend({

  tagName: "div",
  className: "player",
  requiredTemplates: [
    "Player",
  ],
  template: null,

  initialize: function() {
    this.tabID = this.options.tabID;
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
      if (cassetteMgr.currentCassette) {
        cassetteMgr.currentCassette.getBrowseList(context, function(trackJSONs) {
          console.log("dump::::" + JSON.stringify(trackJSONs));
          var browseTrackList = new Einplayer.Backend.Collections.TrackList
                                                     (trackJSONs);
      
          var browseView = Einplayer.Backend
                                    .TemplateManager
                                    .renderView("TrackList",
                                                { trackList: browseTrackList });

          var browseListID = "browse-list";
          browseView.id = browseListID;
          Einplayer.Backend.MessageHandler.pushView(browseListID,
                                                    browseView);
        });
      }
      else {
        // TODO show CassetteList in front
      }
    }
    
    chrome.tabs.get(this.tabID, function(tab) {
      Einplayer.Backend.Utils.getContext(loadCassettesAndBrowse, tab);
    });
    return this.el;
  },

  populateBrowseList : function(trackJSONs) {

  },
});
