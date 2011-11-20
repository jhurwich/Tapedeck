if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
  Tapedeck.Frontend = { };
}
if (typeof(Tapedeck.Frontend.Frame) != "undefined") {
  return;
}

Tapedeck.Frontend.Frame = {
  init : function() {
    
  },
  
  Player : {
    VolumeSlider : {
      currentVolume: -1,
      currentOffset: -1,
      dragging: false,
      startY: 0,
      offsetY: 0,
      
      setHandle: function(offset) {  
        $("#volume-slider #handle").css('top', offset);
      },
      
      updateSlider: function(volumePercent) {
        var slider = Tapedeck.Frontend.Frame.Player.VolumeSlider;

        var offset = slider.percentOffset(volumePercent);
        slider.setHandle(offset);
      },
      
      downOnHandle: function(e) {
        var slider = Tapedeck.Frontend.Frame.Player.VolumeSlider;
        
        var target = e.target;
        while($(target).attr('id') != "handle") {
          target = $(target).parent();
          if (target == null || !target) {
            console.error("Couldn't locate handle");
            return;
          }
        }
    
        if ($("#volume-slider").hasClass("disabled")) {
          return;
        }
    
        slider.dragging = true;
        
        // grab the mouse position
        slider.startY = e.clientY;
        
        // grab the clicked element's position
        var top = parseInt($(target).css('top'));
        slider.offsetY = (top == null || isNaN(top)) ? 0 : top;
    
        // tell our code to start moving the element with the mouse
        document.onmousemove = slider.moveHandle;
    
        $("#tapedeck-content").mouseleave(function() {
          // reset the slider if the mouse leaves during drag
          if (slider.dragging) {
            document.onmousemove = null;
            document.onselectstart = null;
            slider.dragging = false;
            slider.setHandle(slider.currentOffset);
          }
        });
        
        // cancel out any text selections
        document.body.focus();
        
        // prevent text selection (except IE)
        return false;
      },
      
      moveHandle: function(e) {
        var slider = Tapedeck.Frontend.Frame.Player.VolumeSlider;
        
        // this is the actual "drag code"
        var newOffset = (slider.offsetY +
                         e.clientY -
                         slider.startY);
        if (newOffset < 0) {
          newOffset = 0;
        }
    
        var sliderHeight = parseInt($("#volume-slider").css("height"));
        var maxOffset = sliderHeight - 5; // 5px less looks nice
        if (newOffset > maxOffset) {
          newOffset = maxOffset;
        }
    
        slider.setHandle(newOffset, true);
      },

      offsetPercent: function(offset) {
        var sliderHeight = parseInt($("#volume-slider").css("height"));
        var maxOffset = sliderHeight - 5; // 5px less looks nice
    
        return (offset/maxOffset);
      },
      percentOffset: function(percent) {
        var sliderHeight = parseInt($("#volume-slider").css("height"));
        var maxOffset = sliderHeight - 5; // 5px less looks nice
        return maxOffset * (1 - percent);
      },
    },

    SeekSlider : {
      dragging: false,
      startX: 0,
      offsetX: 0,
      currentTime: -1,
      duration: -1,

      downOnHandle: function(e) {
        var slider = Tapedeck.Frontend.Frame.Player.SeekSlider;
        var target = e.target;
        while($(target).attr('id') != "handle") {
          target = $(target).parent();
          if (target == null || !target) {
            console.error("Couldn't locate handle");
            return;
          }
        }
    
        if ($("#seek-slider").hasClass("disabled")) {
          return;
        }
    
        slider.dragging = true;
        
        // grab the mouse position
        slider.startX = e.clientX;
        
        // grab the clicked element's position
        var left = parseInt($(target).css('left'));
        slider.offsetX = (left == null || isNaN(left)) ? 0 : left;
    
        // tell our code to start moving the element with the mouse
        document.onmousemove = slider.moveHandle;
    
        $("#tapedeck-content").mouseleave(function() {
          // reset the slider if the mouse leaves during drag
          if (slider.dragging) {
            document.onmousemove = null;
            document.onselectstart = null;
            slider.dragging = false;
          }
        });
        
        // cancel out any text selections
        document.body.focus();
        
        // prevent text selection (except IE)
        return false;
      },
      
      moveHandle: function(e) {
        var slider = Tapedeck.Frontend.Frame.Player.SeekSlider;
        
        // this is the actual "drag code"
        var newOffset = (slider.offsetX +
                         e.clientX -
                         slider.startX);
        if (newOffset < 0) {
          newOffset = 0;
        }
    
        var sliderWidth = parseInt($("#seek-slider").css("width"));
        var maxOffset = sliderWidth - 15; // 15px less looks nice
        if (newOffset > maxOffset) {
          newOffset = maxOffset;
        }
    
        slider.setHandle(newOffset, true);
      },
      
      updateSlider: function(currentTime, duration) {
        var slider = Tapedeck.Frontend.Frame.Player.SeekSlider;
        slider.currentTime = currentTime;
        slider.duration = duration;
        
        var prettyDuration = slider.prettifyTime(duration);
        if ($("#duration").html() != prettyDuration) {
          $("#duration").html(prettyDuration);
        }
        
        if (slider.dragging) {
          return;
        }
        offset = slider.calculateOffset();
        this.setHandle(offset);
      },
  
      setHandle: function(offset, displayTime) {
        if (typeof(displayTime) == "undefined") {
          displayTime = false;
        }
        var slider = Tapedeck.Frontend.Frame.Player.SeekSlider;
  
        var positionPercent = slider.offsetPercent(offset);
        var timeAtPosition = positionPercent * slider.duration;

        var handle = $("#seek-slider #handle");
        var handleVal = $("#seek-slider #handle-val");
        $(handle).css('left', offset)
        $(handleVal).html(slider.prettifyTime(timeAtPosition));
        
        if (displayTime) {
          $(handleVal).css("display", "block");
        }
        else if (!($(handleVal).hasClass("hover"))) {
          $(handleVal).css("display", "none");
        }
      },
    
      offsetPercent: function(offset) {
        var sliderWidth = parseInt($("#seek-slider").css("width"));
        var maxOffset = sliderWidth - 15; // 15px less looks nice
    
        return (offset/maxOffset);
      },
      calculateOffset: function() {
        var sliderWidth = parseInt($("#seek-slider").css("width"));
        var maxOffset = sliderWidth - 15; // 15px less looks nice
        
        return Math.floor((this.currentTime/this.duration) * maxOffset);
      },
      prettifyTime: function (inSeconds) {
        var minutes = (Math.floor(inSeconds / 60)).toString();
        var seconds = Math.floor((inSeconds % 60)).toString();
        if (seconds.length == 1) {
          seconds = "0" + seconds;
        }
        return "" + minutes + ":" + seconds
      },
    
      mouseoverHandle: function(e) {
        if ($("#seek-slider").hasClass("disabled")) {
          return;
        }
    
        var handleVal = $("#seek-slider #handle-val");
        $(handleVal).css("display", "block");
        $(handleVal).addClass("hover");
      },
      mouseleaveHandle: function(e) {
        if ($("#seek-slider").hasClass("disabled")) {
          return;
        }
    
        var handleVal = $("#seek-slider #handle-val");
        $(handleVal).removeClass("hover");
        $(handleVal).css("display", "none");
      },
    }, // End Tapedeck.Frontend.Frame.Player.SeekSlider
  
    mouseUp: function(e) {
      var seekslider = Tapedeck.Frontend.Frame.Player.SeekSlider;
      
      if (seekslider.dragging){
        // we're done with these events until the next OnMouseDown
        document.onmousemove = null;
        document.onselectstart = null;
        seekslider.dragging = false;
        
        var offset = parseInt($("#seek-slider #handle").css('left'));
        var percent = seekslider.offsetPercent(offset);
        
        Tapedeck.Frontend.Messenger.seekPercent(percent);
      }
      
      var volumeslider = Tapedeck.Frontend.Frame.Player.VolumeSlider;
      
      if (volumeslider.dragging){
        // we're done with these events until the next OnMouseDown
        document.onmousemove = null;
        document.onselectstart = null;
        volumeslider.dragging = false;
        
        // We calculate percent from the top of the slider,
        // that's the opposite of the desired volume percentage.
        var offset = parseInt($("#volume-slider #handle").css('top'));
        volumeslider.currentOffset = offset;
        volumeslider.currentVolume = (1 - volumeslider.offsetPercent(offset));


        Tapedeck.Frontend.Messenger.setVolume(volumeslider.currentVolume);
      }
    },
  }, // End Tapedeck.Frontend.Frame.Player
  
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
  
  clickTimer: null,
  clickID   : null,
  rowClick: function(e) {
    var row = $(e.target).closest(".row");
    
    // make sure this isn't actually a double click
    if (Tapedeck.Frontend.Frame.clickTimer != null) {
          
      clearTimeout(Tapedeck.Frontend.Frame.clickTimer);
      Tapedeck.Frontend.Frame.clickTimer = null;
                  
      // make sure it's a double click on the same element
      if ($(row).attr("index") == Tapedeck.Frontend.Frame.clickID) {
        Tapedeck.Frontend.Frame.clicked = null;

        // Find out and call the correct double click function
        var dblClickFnName = $(row).closest("[rowdblclick]")
                                   .attr("rowdblclick");
        Tapedeck.Frontend.Frame[dblClickFnName](row);
        return;
      }
    }

    Tapedeck.Frontend.Frame.clickID = $(row).attr("index");
    Tapedeck.Frontend.Frame.clickTimer = setTimeout(function() {
      
      Tapedeck.Frontend.Frame.clickTimer = null;
      
      if (!$(row).hasClass("selected")) {
        $(row).addClass("selected");
      }
      else {
        $(row).removeClass("selected");
      }
    }, 200);
  },

  browseDblClick: function(row) {
    Tapedeck.Frontend.Frame.queueBrowseRow(row);
  },

  queueDblClick: function(row) {
    Tapedeck.Frontend.Frame.playQueueRow(row);
  },

  queueBrowseRow: function(row) {
    var trackID = $(row).attr("track-id");
    Tapedeck.Frontend.Messenger.queueTrack(trackID);
  },

  playQueueRow: function(row) {
    var index = $(row).attr("index");
    Tapedeck.Frontend.Messenger.playIndex(index);
  },

  playPlaylist: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var target = $(e.target).closest(".row");
    var index = $(target).attr("index");
    Tapedeck.Frontend.Messenger.playPlaylist(index);
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
    Tapedeck.Frontend.Messenger.removePlaylist(index);
  },

  rowDrag: {
    tracks : [],
    from: "",
  },
  rowDragStart: function(e) {
    var rowDrag = Tapedeck.Frontend.Frame.rowDrag;
    console.log("row-drag-start");
    var target = $(e.target).closest(".row");

    var dataTransfer = window.event.dataTransfer;
    dataTransfer.effectAllowed = 'move';
    dataTransfer.setData('Text', "hi!"); // needed for Mac drop effects

    rowDrag.from = $(target).closest(".tracklist-container").first().attr("id");
    console.log("id: " + rowDrag.from);
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
    console.log("drag-enter");
    var target = $(e.target).closest(".row");
    $(target).addClass("drag-target");
  },
  rowDragLeave: function(e) {
    console.log("drag-leave");
    var target = $(e.target).closest(".row");
    $(target).removeClass("drag-target");
  },
  rowDragEnd: function(e) {
    console.log("drag-end");
    $(".drag-target").each(function(index, dragTarget) {
      $(dragTarget).removeClass("drag-target");
    });
  },
  rowDragOver: function(e) {
    if (e.preventDefault) {
      e.preventDefault(); // Necessary. Allows us to drop.
    }
    console.log("drag-over");
  },
  rowDrop: function(e) {
    console.log("drag-drop");
    var rowDrag = Tapedeck.Frontend.Frame.rowDrag;
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
      Tapedeck.Frontend.Messenger.moveTracks(rowDrag.tracks, dropIndex + 1);
    }
    else {
      // If dropping from browse to queue, queueTracks
      Tapedeck.Frontend.Messenger.queueTracks(rowDrag.tracks, dropIndex + 1);
    }
    
    rowDrag.tracks = [];

    return false;
  },

  rowButtonRemove: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var row = $(e.target).closest(".row");

    Tapedeck.Frontend.Messenger.removeQueuedAt($(row).attr("index"));
  },

  rowButtonPlaynow: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
   
    var row = $(e.target).closest(".row");

    if ($(row).closest(".tracklist-container").attr("id") == "queue-list") {
      // to play immediately from the queue we can just play the row
      Tapedeck.Frontend.Frame.playQueueRow(row);
    }
    else {
      // to play immediately from the browselist we must queueAndPlay
      Tapedeck.Frontend.Messenger.queueAndPlayNow($(row).attr("track-id"));
    }
  },
  
  rowButtonQueue: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var row = $(e.target).closest(".row");

    Tapedeck.Frontend.Frame.queueBrowseRow(row);
  },

  rowButtonDownload: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var row = $(e.target).closest(".row");
    var trackType = $(row).attr("track-type");

    switch (trackType) {
      case "mp3":
        Tapedeck.Frontend.Frame.download($(row).attr("track-id"));
        break;

      default:
        console.error("We cannot download this file");
        break;
    }
  },

  download: function(trackID) {
    // Download will send us a filesystem:// url when it's done and
    // we can trigger the download when by setting location.href.
    // We do it to a sub-iframe, however, so if something goes wrong
    // we're not sending someone into an abyss.
    var callback = function(response) {
      
      var iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = response.url;
      
      $("body").first().append(iframe);
       
      Tapedeck.Frontend.Messenger.finishDownload(trackID);
    }

    Tapedeck.Frontend.Messenger.download(trackID, callback);
  },

  cassetteEject: function(e) {
    Tapedeck.Frontend.Messenger.ejectCassette();
  },

  cassetteRowClick: function(e) {
    var target = e.target;
    while(!$(target).hasClass("row")) {
      target = $(target).parent();
      if (target == null || !target) {
        console.error("Couldn't locate handle");
        return;
      }
    }

    Tapedeck.Frontend.Messenger.setCassette($(target).attr("cassette-id"));
  },

  loadDeveloperLink: function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    Tapedeck.Frontend.Messenger.loadLink($(e.target).attr("url"));
  },

  toggleRepeat: function() {
    Tapedeck.Frontend.Messenger.toggleRepeat();
    Tapedeck.Frontend.Frame.checkRepeat();
  },

  shuffleQueue: function() {
    Tapedeck.Frontend.Messenger.shuffleQueue();
  },

  saveQueue: function() {
    var playlistName = prompt("Please enter a playlist name");
    if (playlistName == null) {
      return;
    }

    Tapedeck.Frontend.Messenger.saveQueue(playlistName);
  },
  
  clearQueue: function() {
    Tapedeck.Frontend.Messenger.clearQueue();
  },

  onFrameRender: function() {
    var frame = Tapedeck.Frontend.Frame;
    
    frame.forceSeekSliderUpdate();
    frame.forceVolumeSliderUpdate();
    frame.checkRepeat();
  },

  forceSeekSliderUpdate: function() {
    if (!($("#seek-slider").hasClass("disabled"))) {
      Tapedeck.Frontend.Messenger.requestUpdate("SeekSlider");
    }
  },

  forceVolumeSliderUpdate: function() {
    if (!($("#volume-slider").hasClass("disabled"))) {
      Tapedeck.Frontend.Messenger.requestUpdate("VolumeSlider");
    }
  },

  checkRepeat: function() {
    Tapedeck.Frontend.Messenger.getRepeat(function(response) {
      if (response.repeat) {
        $("#repeat").attr("src", chrome.extension.getURL("images/repeat-active.png"));
      }
      else {
        $("#repeat").attr("src", chrome.extension.getURL("images/repeat.png"))
      }
    });
  },

};
