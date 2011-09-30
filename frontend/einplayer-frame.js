if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}
if (typeof(Einplayer.Frontend.Frame) != "undefined") {
  return;
}

Einplayer.Frontend.Frame = {
  init : function() {
    this.Player.update("stop");
  },
  
  Player : { 
    currentTrack: null,
    currentState: null,

    update: function(state, track) {
      if (typeof(track) != "undefined" &&
          track != null &&
          !$.isEmptyObject(track)) {
        this.currentTrack = track;
      }
      this.currentState = state;
      this.updateBanner();
      this.updateSlider();
    },
    
    updateBanner: function() {
      // jhawk complicated for load. make sure that's catching
      if(typeof(this.currentTrack) == "undefined" ||
         this.currentTrack == null ||
         $.isEmptyObject(this.currentTrack) ||
         this.currentState == "stop" ) {
        $("#banner").html(this.currentState + " playback");
        return;
      }

      var bannerString = "";
      if (typeof(this.currentTrack.artistName) != "undefined" &&
          this.currentTrack.artistName.length > 0) {
        bannerString += this.currentTrack.artistName;
      }
      
      if (typeof(this.currentTrack.trackName) != "undefined" &&
          this.currentTrack.trackName.length > 0) {
        if (bannerString.length > 0) {
          bannerString += " &ndash; ";
        }
        bannerString += this.currentTrack.trackName
      }
      
      $("#banner").html(this.currentState + ": " + bannerString); 
    },

    updateSlider: function() {
      var offset = 0;
      if (this.currentState == "play" ||
          this.currentState == "pause" ) {
        // For playing or paused update the slider
        if (typeof(this.currentTrack.currentTime) != "undefined" && 
            typeof(this.currentTrack.duration) != "undefined") {
          var currentTime = this.currentTrack.currentTime;
          var duration = this.currentTrack.duration;
          offset = Einplayer.Frontend.Frame.timeToOffset(currentTime,
                                                         duration);
        }
        $("#slider").removeClass("disabled");
      } else {
        // For stop or loading reset and disable the slider
        $("#slider").addClass("disabled");
      }
      
      this.setSlider(offset);
    },

    setSlider: function(offset) {
      $("#handle").css('left', offset)
    },
  
  },
  
  replaceView: function(id, viewStr) {
    var view = $(viewStr);
    $("#" + id).replaceWith(view);

    var delegates = $(view).find(".delegate-events");
    
    for (var i = 0; i < delegates.length; i++) {
      var delegate = delegates[i];
      var functionStr = $(delegate).html();

      var attachEvents = new Function(functionStr);
      attachEvents();
    }
  },
  
  // kudos to http://luke.breuer.com/tutorial/javascript-drag-and-drop-tutorial.aspx
  clickAndDrag: {
    startX: 0,
    offsetX: 0,
    maxOffset: 0,
    dragElement: null,
  },
  downOnHandle: function(e) {
    console.log("down on handle");
    var clickAndDrag = Einplayer.Frontend.Frame.clickAndDrag;
    var target = e.target;
    while($(target).attr('id') != "handle") {
      target = $(target).parent();
      if (target == null || !target) {
        console.error("Couldn't locate handle");
        return;
      }
    }

    if ($("#slider").hasClass("disabled")) {
      return;
    }
    
    // grab the mouse position
    clickAndDrag.startX = e.clientX;

    // determine the max sliding width
    var sliderWidth = parseInt($("#slider").css("width"));
    clickAndDrag.maxOffset = sliderWidth - 15; // 15px less looks nice
    
    // grab the clicked element's position
    var left = parseInt($(target).css('left'));
    clickAndDrag.offsetX = (left == null || isNaN(left)) ? 0 : left;

    clickAndDrag.dragElement = target;

    // tell our code to start moving the element with the mouse
    document.onmousemove = Einplayer.Frontend.Frame.moveHandle;
    
    // cancel out any text selections
    document.body.focus();

    // prevent text selection in IE
    document.onselectstart = function () { return false; };
    // prevent IE from trying to drag an image
    target.ondragstart = function() { return false; };
    
    // prevent text selection (except IE)
    return false;
  },
  
  moveHandle: function(e) {
    console.log("handling move");   
    var clickAndDrag = Einplayer.Frontend.Frame.clickAndDrag;
    
    // this is the actual "drag code"
    var newOffset = (clickAndDrag.offsetX +
                     e.clientX -
                     clickAndDrag.startX);
    if (newOffset < 0) {
      newOffset = 0;
    }

    if (newOffset > clickAndDrag.maxOffset) {
      newOffset = clickAndDrag.maxOffset;
    }
        
    clickAndDrag.dragElement.css('left', newOffset);
  },
  
  mouseUp: function(e) {
    var clickAndDrag = Einplayer.Frontend.Frame.clickAndDrag;
    
    if (clickAndDrag.dragElement != null){
      // we're done with these events until the next OnMouseDown
      document.onmousemove = null;
      document.onselectstart = null;
      clickAndDrag.dragElement.ondragstart = null;

      var offset = parseInt(clickAndDrag.dragElement.css('left'));
      var totalTime = Einplayer.Frontend.Frame.Player.currentTrack.duration;
      var time = Einplayer.Frontend.Frame.offsetToTime(offset, totalTime);
      
      Einplayer.Frontend.Messenger.seekCurrentTrack(time);

      // this is how we know we're not dragging      
      clickAndDrag.dragElement = null;
    }
  },
  timeToOffset: function(current, totalTime) {
    if(this.clickAndDrag.maxOffset > 0) {
      return Math.floor((current/totalTime) * this.clickAndDrag.maxOffset);
    }
    return -1;
  },
  offsetToTime: function(offset, totalTime) {
    if(this.clickAndDrag.maxOffset > 0) {
      return Math.floor((offset/this.clickAndDrag.maxOffset) * totalTime);
    }
    return -1;
  },
  
  
  clickTimer: null,
  clickID   : null,
  rowClick: function(e) {
    var row = $(e.target).closest(".row");
    
    // make sure this isn't actually a double click
    if (Einplayer.Frontend.Frame.clickTimer != null) {
          
      clearTimeout(Einplayer.Frontend.Frame.clickTimer);
      Einplayer.Frontend.Frame.clickTimer = null;
                  
      // make sure it's a double click on the same element
      if ($(row).attr("index") == Einplayer.Frontend.Frame.clickID) {
        Einplayer.Frontend.Frame.clicked = null;

        // Find out and call the correct double click function
        var dblClickFnName = $(row).closest("[rowdblclick]")
                                   .attr("rowdblclick");
        Einplayer.Frontend.Frame[dblClickFnName](row);
        return;
      }
    }

    Einplayer.Frontend.Frame.clickID = $(row).attr("index");
    Einplayer.Frontend.Frame.clickTimer = setTimeout(function() {
      
      Einplayer.Frontend.Frame.clickTimer = null;
      
      if (!$(row).hasClass("selected")) {
        $(row).addClass("selected");
      }
      else {
        $(row).removeClass("selected");
      }
    }, 200);
  },

  browseDblClick: function(row) {
    var trackID = $(row).attr("trackID");
    Einplayer.Frontend.Messenger.queueTrack(trackID);
  },

  queueDblClick: function(row) {
    var trackID = $(row).attr("trackID");
    Einplayer.Frontend.Messenger.playTrack(trackID);
  },

};
