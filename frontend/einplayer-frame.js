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
    Slider : {
      currentTime: -1,
      duration: -1,
      calculateOffset: function() {
        var sliderWidth = parseInt($("#slider").css("width"));
        var maxOffset = sliderWidth - 15; // 15px less looks nice
        
        return Math.floor((this.currentTime/this.duration) * maxOffset);
      },
    },

    prettifyTime: function (inSeconds) {
      var minutes = (Math.floor(inSeconds / 60)).toString();
      var seconds = Math.floor((inSeconds % 60)).toString();
      if (seconds.length == 1) {
        seconds = "0" + seconds;
      }
      return "" + minutes + ":" + seconds
    },
    
    updateSlider: function(currentTime, duration) {
      var slider = Einplayer.Frontend.Frame.Player.Slider;
      slider.currentTime = currentTime;
      slider.duration = duration;
      var prettyDuration = Einplayer.Frontend.Frame.Player.prettifyTime
                                                          (duration);
      if ($("#duration").html() != prettyDuration) {
        $("#duration").html(prettyDuration);
      }
      
      if (Einplayer.Frontend.Frame.sliderDrag.dragging) {
        return;
      }
      offset = slider.calculateOffset();
      this.setHandle(offset);
    },

    setHandle: function(offset, displayTime) {
      if (typeof(displayTime) == "undefined") {
        displayTime = false;
      }
      var slider = Einplayer.Frontend.Frame.Player.Slider;

      var positionPercent = Einplayer.Frontend.Frame.offsetPercent(offset);
      var timeAtPosition = positionPercent * slider.duration;

      $("#handle").css('left', offset)
      $("#handle-val").html(Einplayer.Frontend.Frame.Player.prettifyTime
                                                           (timeAtPosition));
      if (displayTime) {
        $("#handle-val").css("display", "block");
      }
      else if (!($("#handle-val").hasClass("hover"))) {
        $("#handle-val").css("display", "none");
      }
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

    $("#einplayer-content").mouseleave(function() {
      // reset the slider if the mouse leaves during drag
      if (sliderDrag.dragging) {
        document.onmousemove = null;
        document.onselectstart = null;
        sliderDrag.dragging = false;
      }
    });
    
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

    Einplayer.Frontend.Frame.Player.setHandle(newOffset, true);
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
  offsetPercent: function(offset) {
    var sliderWidth = parseInt($("#slider").css("width"));
    var maxOffset = sliderWidth - 15; // 15px less looks nice

    return (offset/maxOffset);
  },

  mouseoverHandle: function(e) {
    if ($("#slider").hasClass("disabled")) {
      return;
    }

    $("#handle-val").css("display", "block");
    $("#handle-val").addClass("hover");
  },
  mouseleaveHandle: function(e) {
    if ($("#slider").hasClass("disabled")) {
      return;
    }

    $("#handle-val").removeClass("hover");
    $("#handle-val").css("display", "none");
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
    Einplayer.Frontend.Frame.queueBrowseRow(row);
  },

  queueDblClick: function(row) {
    Einplayer.Frontend.Frame.playQueueRow(row);
  },

  queueBrowseRow: function(row) {
    var trackID = $(row).attr("track-id");
    Einplayer.Frontend.Messenger.queueTrack(trackID);
  },

  playQueueRow: function(row) {
    var index = $(row).attr("index");
    Einplayer.Frontend.Messenger.playIndex(index);
  },

  playPlaylist: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var target = $(e.target).closest(".row");
    var index = $(target).attr("index");
    Einplayer.Frontend.Messenger.playPlaylist(index);
  },

  showPlaylistList: function() {
    var content = $("#playlist-list-content");
    $(content).css("display", "table");
  },

  hidePlaylistList: function() {
    var content = $("#playlist-list-content");
    $(content).css("display", "none");
  },
  
  rowButtonRemovePlaylist: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var target = $(e.target).closest(".row");
    var index = $(target).attr("index");
    Einplayer.Frontend.Messenger.removePlaylist(index);
  },

  rowDrag: {
    tracks : [],
    from: "",
  },
  rowDragStart: function(e) {
    var rowDrag = Einplayer.Frontend.Frame.rowDrag;
    
    var target = $(e.target).closest(".row");

    var dataTransfer = window.event.dataTransfer;
    dataTransfer.effectAllowed = 'move';

    rowDrag.from = $(target).closest(".tracklist-container").first().attr("id");

    if ($(target).hasClass("selected")) {
      // target was selected, grab all selected tracks
      var trackList = $(target).closest(".tracklist");
      var selected = $(trackList).find(".selected");
      $(selected).each(function(selIndex, row) {
        var index = $(row).attr("index");
        var trackID = $(row).attr("track-id");
        rowDrag.tracks.push({ index   : index,
                              trackID : trackID });
      });
    }
    else {
      // target was not selected, only grab a track for the one row
      var index = $(target).attr("index");
      var trackID = $(target).attr("track-id");
      rowDrag.tracks.push({ index   : index,
                            trackID : trackID });
    }
  },
  rowDragEnter: function(e) {
    var target = $(e.target).closest(".row");
    $(target).addClass("drag-target");
  },
  rowDragLeave: function(e) {
    var target = $(e.target).closest(".row");
    $(target).removeClass("drag-target");
  },
  rowDragEnd: function(e) {
    $(".drag-target").each(function(index, dragTarget) {
      $(dragTarget).removeClass("drag-target");
    });
  },
  rowDragOver: function(e) {
    if (e.preventDefault) {
      e.preventDefault(); // Necessary. Allows us to drop.
    }
  },
  rowDrop: function(e) {
    var rowDrag = Einplayer.Frontend.Frame.rowDrag;
    if (e.stopPropagation) {
      e.stopPropagation(); // stops redirecting in some cases.
    }
    
    var target = $(e.target).closest(".row");

    var dropIndex = parseInt(target.attr("index"));

    rowDrag.tracks.sort(function(a,b) {
      return a.index - b.index;
    });

    
    if (rowDrag.from.match(/queue/) != null) {
      // If dropping from queue to queue, moveTracks
      Einplayer.Frontend.Messenger.moveTracks(rowDrag.tracks, dropIndex + 1);
    }
    else {
      // If dropping from browse to queue, queueTracks
      Einplayer.Frontend.Messenger.queueTracks(rowDrag.tracks, dropIndex + 1);
    }
    
    rowDrag.tracks = [];

    return false;
  },

  rowButtonRemove: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var row = $(e.target).closest(".row");

    Einplayer.Frontend.Messenger.removeQueuedAt($(row).attr("index"));
  },

  rowButtonPlaynow: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
   
    var row = $(e.target).closest(".row");

    if ($(row).closest(".tracklist-container").attr("id") == "queue-list") {
      // to play immediately from the queue we can just play the row
      Einplayer.Frontend.Frame.playQueueRow(row);
    }
    else {
      // to play immediately from the browselist we must queueAndPlay
      Einplayer.Frontend.Messenger.queueAndPlayNow($(row).attr("track-id"));
    }
  },
  
  rowButtonQueue: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var row = $(e.target).closest(".row");

    Einplayer.Frontend.Frame.queueBrowseRow(row);
  },

  rowButtonDownload: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var row = $(e.target).closest(".row");
    var trackType = $(row).attr("track-type");

    switch (trackType) {
      case "mp3":
        Einplayer.Frontend.Frame.download($(row).attr("track-id"));
        break;

      default:
        console.error("We cannot download this file");
        break;
    }
  },

  download: function(trackID) {
    // Download will send us a filesystem:// url when it's done and
    // we can trigger the download when by setting location.href
    var callback = function(response) {
      window.location.href = response.url;
    }

    Einplayer.Frontend.Messenger.download(trackID, callback);
  },

  toggleRepeat: function() {
    Einplayer.Frontend.Messenger.toggleRepeat();
    Einplayer.Frontend.Frame.checkRepeat();
  },

  shuffleQueue: function() {
    Einplayer.Frontend.Messenger.shuffleQueue();
  },

  saveQueue: function() {
    var playlistName = prompt("Please enter a playlist name");
    if (playlistName == null) {
      return;
    }

    Einplayer.Frontend.Messenger.saveQueue(playlistName);
  },
  
  clearQueue: function() {
    Einplayer.Frontend.Messenger.clearQueue();
  },

  onFrameRender: function() {
    var frame = Einplayer.Frontend.Frame;
    
    frame.forceSliderUpdate();
    frame.checkRepeat();
  },

  forceSliderUpdate: function() {
    if (!($("#slider").hasClass("disabled"))) {
      Einplayer.Frontend.Messenger.requestUpdate("Slider");
    }
  },

  checkRepeat: function() {
    Einplayer.Frontend.Messenger.getRepeat(function(response) {
      if (response.repeat) {
        $("#repeat").attr("src", chrome.extension.getURL("images/repeat-active.png"));
      }
      else {
        $("#repeat").attr("src", chrome.extension.getURL("images/repeat.png"))
      }
    });
  },

};
