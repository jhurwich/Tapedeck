if (typeof Einplayer == "undefined") {
  var Einplayer = { };
  Einplayer.Frontend = { };
}
if (typeof(Einplayer.Frontend.Frame) != "undefined") {
  return;
}

Einplayer.Frontend.Frame = {
  init : function() {
    
  },
  
  Player : { 
    updateSlider: function(currentTime, duration) {
      if (Einplayer.Frontend.Frame.sliderDrag.dragging) {
        return;
      }
      offset = Einplayer.Frontend.Frame.timeToOffset(currentTime,
                                                     duration);
      this.setSlider(offset);
    },

    setSlider: function(offset) {
      $("#handle").css('left', offset)
      $("#debug").html(offset);
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
  sliderDrag: {
    dragging: false,
    startX: 0,
    offsetX: 0,
  },
  downOnHandle: function(e) {
    var sliderDrag = Einplayer.Frontend.Frame.sliderDrag;
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

    sliderDrag.dragging = true;
    
    // grab the mouse position
    sliderDrag.startX = e.clientX;
    
    // grab the clicked element's position
    var left = parseInt($(target).css('left'));
    sliderDrag.offsetX = (left == null || isNaN(left)) ? 0 : left;

    // tell our code to start moving the element with the mouse
    document.onmousemove = Einplayer.Frontend.Frame.moveHandle;
    
    // cancel out any text selections
    document.body.focus();
    
    // prevent text selection (except IE)
    return false;
  },
  
  moveHandle: function(e) {
    var sliderDrag = Einplayer.Frontend.Frame.sliderDrag;
    
    // this is the actual "drag code"
    var newOffset = (sliderDrag.offsetX +
                     e.clientX -
                     sliderDrag.startX);
    if (newOffset < 0) {
      newOffset = 0;
    }

    var sliderWidth = parseInt($("#slider").css("width"));
    var maxOffset = sliderWidth - 15; // 15px less looks nice
    if (newOffset > maxOffset) {
      newOffset = maxOffset;
    }

    Einplayer.Frontend.Frame.Player.setSlider(newOffset);
  },
  
  mouseUp: function(e) {
    var sliderDrag = Einplayer.Frontend.Frame.sliderDrag;
    
    if (sliderDrag.dragging){
      // we're done with these events until the next OnMouseDown
      document.onmousemove = null;
      document.onselectstart = null;
      sliderDrag.dragging = false;
      
      var offset = parseInt($("#handle").css('left'));
      var percent = Einplayer.Frontend.Frame.offsetPercent(offset);
      
      Einplayer.Frontend.Messenger.seekPercent(percent);
    }
  },
  timeToOffset: function(current, totalTime) {
    var sliderWidth = parseInt($("#slider").css("width"));
    var maxOffset = sliderWidth - 15; // 15px less looks nice
    
    return Math.floor((current/totalTime) * maxOffset);
  },
  offsetPercent: function(offset, totalTime) {
    var sliderWidth = parseInt($("#slider").css("width"));
    var maxOffset = sliderWidth - 15; // 15px less looks nice

    return (offset/maxOffset);
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
    var trackID = $(row).attr("track-id");
    Einplayer.Frontend.Messenger.queueTrack(trackID);
  },

  queueDblClick: function(row) {
    var index = $(row).attr("index");
    Einplayer.Frontend.Messenger.playIndex(index);
  },

  clearQueue: function() {
    Einplayer.Frontend.Messenger.clearQueue();
  },

  forceSliderUpdate: function() {
    Einplayer.Frontend.Messenger.requestUpdate("Slider");
  },

};
