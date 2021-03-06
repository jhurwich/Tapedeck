if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
  Tapedeck.Frontend = { };
}
if (typeof(Tapedeck.Frontend.Frame) != "undefined") {
  return;
}

Tapedeck.Frontend.Frame = {
  Onscreen : {
    playPause: function(e) {
      Tapedeck.Frontend.Messenger.playPause();
    },
    next: function(e) {
      if (e.shiftKey) {
        Tapedeck.Frontend.Messenger.deleteCurrent();
      }
      else {
        Tapedeck.Frontend.Messenger.next();
      }
    },
    prev: function(e) {
      Tapedeck.Frontend.Messenger.prev();
    },
    setDrawerOpened: function(e) {
      Tapedeck.Frontend.Frame.openDrawer();
    },
    setDrawerClosed: function(e) {
      Tapedeck.Frontend.Frame.closeDrawer();
    }
  },

  Player : {
    VolumeSlider : {
      currentVolume: -1,
      currentOffset: -1,
      dragging: false,
      startY: 0,
      offsetY: 0,
      sliderBuffer: 1, // 1px at the top of the slider is not used

      setHandle: function(offset) {
        var slider = Tapedeck.Frontend.Frame.Player.VolumeSlider;
        if (offset <= slider.sliderBuffer) {
          offset = slider.sliderBuffer; // prevent the slider from exceeding the buffer
        }
        $(".volume-slider .handle").first().css('top', offset);
      },

      updateSlider: function(volumePercent) {
        var slider = Tapedeck.Frontend.Frame.Player.VolumeSlider;

        var offset = slider.percentOffset(volumePercent);
        slider.setHandle(offset);
      },

      downOnHandle: function(e) {
        var slider = Tapedeck.Frontend.Frame.Player.VolumeSlider;

        var target = e.target;
        while(!($(target).hasClass('handle'))) {
          target = $(target).parent();
          if (target == null || !target) {
            console.error("Couldn't locate handle");
            return;
          }
        }

        if ($(".volume-slider").first().hasClass("disabled")) {
          return;
        }

        slider.dragging = true;

        // grab the mouse position
        slider.startY = e.clientY;

        // grab the clicked element's position
        var top = parseInt($(target).css('top'), 10);
        slider.offsetY = (top == null || isNaN(top)) ? 0 : top;

        // tell our code to start moving the element with the mouse
        document.onmousemove = slider.moveHandle;

        $("#frame").mouseleave(function() {
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

        var sliderHeight = parseInt($(".volume-slider").first().css("height"), 10);
        var maxOffset = sliderHeight;
        if (newOffset > maxOffset) {
          newOffset = maxOffset;
        }

        slider.setHandle(newOffset, true);
      },

      offsetPercent: function(offset) {
        var slider = Tapedeck.Frontend.Frame.Player.VolumeSlider;
        if (offset <= slider.sliderBuffer) {
          offset = slider.sliderBuffer; // prevent the slider from exceeding the buffer
        }

        var sliderHeight = parseInt($(".volume-slider").first().css("height"), 10);
        var maxOffset = sliderHeight;

        return (offset/maxOffset);
      },
      percentOffset: function(percent) {
        var sliderHeight = parseInt($(".volume-slider").first().css("height"), 10);
        var maxOffset = sliderHeight;
        return maxOffset * (1 - percent);
      },
    },

    SeekSlider : {
      dragging: false,
      startX: 0,
      offsetX: 0,
      currentTime: -1,
      duration: -1,
      sliderBuffer: 6, // 6px to the right of the slider is not used

      downOnHandle: function(e) {
        var slider = Tapedeck.Frontend.Frame.Player.SeekSlider;
        var target = e.target;
        while(!($(target).hasClass('handle'))) {
          target = $(target).parent();
          if (target == null || !target) {
            console.error("Couldn't locate handle");
            return;
          }
        }

        if ($(".seek-slider").first().hasClass("disabled")) {
          return;
        }

        slider.dragging = true;

        // grab the mouse position
        slider.startX = e.clientX;

        // grab the clicked element's position
        var left = parseInt($(target).css('left'), 10);
        slider.offsetX = (left == null || isNaN(left)) ? 0 : left;

        // tell our code to start moving the element with the mouse
        document.onmousemove = slider.moveHandle;

        $("#frame").mouseleave(function() {
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

        var sliderWidth = parseInt($(".seek-slider").first().css("width"), 10);
        var maxOffset = sliderWidth - slider.sliderBuffer;
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
        if ($(".duration").first().html() != prettyDuration) {
          $(".duration").first().html(prettyDuration);
        }

        if (slider.dragging) {
          return;
        }
        var offset = slider.calculateOffset();
        this.setHandle(offset);
      },

      // use displayTime bool to force displaying the time over the handle
      setHandle: function(offset, displayTime) {
        if (typeof(displayTime) == "undefined") {
          displayTime = false;
        }
        var slider = Tapedeck.Frontend.Frame.Player.SeekSlider;

        var positionPercent = slider.offsetPercent(offset);
        var timeAtPosition = positionPercent * slider.duration;

        var handle = $(".seek-slider .handle").first();
        var handleVal = $(".seek-slider .handle-val").first();
        $(handle).css('left', offset);
        $(handleVal).html(slider.prettifyTime(timeAtPosition));

        // show the time if forced, or if the user is hovering over the handle.
        if (displayTime || $(handle).hasClass("hover")) {
          $(handleVal).css("display", "block");

          // hide the duration to make room for the handle's time, if < 25px from the right
          var sliderWidth = parseInt($(".seek-slider").first().css("width"), 10);
          if (sliderWidth - offset <= 25) {
            $(".duration").hide();
          }
          else {
            $(".duration").show();
          }
        }
        else {
          $(handleVal).css("display", "none");
          $(".duration").show();
        }
      },

      offsetPercent: function(offset) {
        var sliderWidth = parseInt($(".seek-slider").first().css("width"), 10);
        var maxOffset = sliderWidth - Tapedeck.Frontend.Frame.Player.SeekSlider.sliderBuffer;

        return (offset/maxOffset);
      },
      calculateOffset: function() {
        var sliderWidth = parseInt($(".seek-slider").first().css("width"), 10);
        var maxOffset = sliderWidth - Tapedeck.Frontend.Frame.Player.SeekSlider.sliderBuffer;

        return Math.floor((this.currentTime/this.duration) * maxOffset);
      },
      prettifyTime: function (inSeconds) {
        var minutes = (Math.floor(inSeconds / 60)).toString();
        var seconds = Math.floor((inSeconds % 60)).toString();
        if (seconds.length == 1) {
          seconds = "0" + seconds;
        }
        return "" + minutes + ":" + seconds;
      },

      mouseoverHandle: function(e) {
        if ($(".seek-slider").first().hasClass("disabled")) {
          return;
        }

        $(".seek-slider .handle").first().addClass("hover");

        // display time immmediately
        var handleVal = $(".seek-slider .handle-val").first();
        $(handleVal).css("display", "block");
      },
      mouseleaveHandle: function(e) {
        if ($(".seek-slider").first().hasClass("disabled")) {
          return;
        }

        $(".seek-slider .handle").first().removeClass("hover");
      },
    }, // End Tapedeck.Frontend.Frame.Player.SeekSlider

    mouseUp: function(e) {
      var seekslider = Tapedeck.Frontend.Frame.Player.SeekSlider;

      if (seekslider.dragging){
        // we're done with these events until the next OnMouseDown
        document.onmousemove = null;
        document.onselectstart = null;
        seekslider.dragging = false;

        var offset = parseInt($(".seek-slider .handle").first().css('left'), 10);
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
        var offset = parseInt($(".volume-slider .handle").first().css('top'), 10);
        volumeslider.currentOffset = offset;
        volumeslider.currentVolume = (1 - volumeslider.offsetPercent(offset));

        Tapedeck.Frontend.Messenger.setVolume(volumeslider.currentVolume);
      }
    },
  }, // End Tapedeck.Frontend.Frame.Player

  TrackLists: {
    clickTimer: null,
    clickID   : null,
    lastSelected: -1,
    lastWasSelected: false,
    rowClick: function(e) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;

      // Make sure we aren't registering a single click that was
      // shortcutted to double click (clicking on trackName)
      if (tracklists.lastDblClickTime == e.timeStamp) {
        return;
      }

      var row = $(e.target).closest(".row");

      // make sure it's not supposed to be a blank or message row
      if ($(row).hasClass("blank") || $(row).hasClass("message")) {
        return;
      }

      // make sure this isn't actually a double click
      if (tracklists.clickTimer != null) {

        clearTimeout(tracklists.clickTimer);
        tracklists.clickTimer = null;

        // make sure it's a double click on the same element
        if ($(row).attr("index") == tracklists.clickID) {
          tracklists.rowDblClick(e);
          return;
        }
      }

      var clickIndex = parseInt($(row).attr("index"), 10);
      tracklists.clickID = clickIndex;
      tracklists.clickTimer = setTimeout(function() {

        tracklists.clickTimer = null;

        var isSelect = !$(row).hasClass("selected");

        // Shift-click trumps other selects when possible
        if (tracklists.lastSelected != -1 &&
            isSelect == tracklists.lastWasSelected &&
            e.shiftKey) {
          var highBound, lowBound;
          // This is a shift click, connect lastSelected and the clickRow
          if (clickIndex > tracklists.lastSelected) {
            lowBound = tracklists.lastSelected;
            highBound = clickIndex;
          }
          else {
            lowBound = clickIndex;
            highBound = tracklists.lastSelected;
          }

          var rows = $(row).closest(".tracklist").find(".row");
          rows.each( function(i, aRow) {
            var pos = parseInt($(aRow).attr("index"), 10);
            if (pos <= highBound && pos >= lowBound) {
              if (isSelect) {
                $(aRow).addClass("selected");
              } else {
                $(aRow).removeClass("selected");
              }
            }
          });

          tracklists.lastSelected = -1;
        } else {
          if (isSelect) {
            $(row).addClass("selected");
            tracklists.lastWasSelected = true;
          }
          else {
            tracklists.lastSelected = -1;
            $(row).removeClass("selected");
            tracklists.lastWasSelected = false;
          }
          tracklists.lastSelected = clickIndex;
        }
      }, 200);
    },

    lastDblClickTime: -1,
    rowDblClick: function(e) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;

      // Save the time of the dblClick because we'll get a single click
      // if this is coming from a trackName click
      tracklists.lastDblClickTime = e.timeStamp;

      var row = $(e.target).closest(".row");

      // Find out and call the correct double click function
      var dblClickFnName = $(row).closest("[rowdblclick]")
                                 .attr("rowdblclick");
      Tapedeck.Frontend.Frame.TrackLists[dblClickFnName](row);
    },

    browseDblClick: function(row) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;
      tracklists.queueBrowseRow(row);
    },

    queueDblClick: function(row) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;
      tracklists.playQueueRow(row);
    },

    queueBrowseRow: function(row) {
      var trackID = $(row).attr("track-id");
      Tapedeck.Frontend.Messenger.queueTrack(trackID);
    },

    playQueueRow: function(row) {
      var index = $(row).attr("index");
      Tapedeck.Frontend.Messenger.playIndex(index);
    },

    rowDrag: {
      tracks : [],
      from: "",
      overRow: false,
      overRemainder: false
    },
    rowDragStart: function(e) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;
      var rowDrag = tracklists.rowDrag;
      var target = $(e.target).closest(".row");

      var dataTransfer = window.event.dataTransfer;
      dataTransfer.effectAllowed = 'move';
      dataTransfer.setData('Text', "hi!"); // needed for Mac drop effects

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
      var rowDrag = Tapedeck.Frontend.Frame.TrackLists.rowDrag;
      rowDrag.overRemainder = false;
      rowDrag.overRow = true;

      var target = $(e.target).closest(".row");
      $(target).addClass("drag-target");
      $(target).closest(".row-container").addClass("drag-target");
    },
    rowDragLeave: function(e) {
      var rowDrag = Tapedeck.Frontend.Frame.TrackLists.rowDrag;
      rowDrag.overRow = false;

      var target = $(e.target).closest(".row");
      $(target).removeClass("drag-target");
      $(target).closest(".row-container").removeClass("drag-target");
    },
    rowDragEnd: function(e) {
      var rowDrag = Tapedeck.Frontend.Frame.TrackLists.rowDrag;

      // trigger the remainderDrop event, if appropriate
      if (!rowDrag.overRow && rowDrag.overRemainder) {
        Tapedeck.Frontend.Frame.TrackLists.remainderDrop(e);
      }
      rowDrag.overRow = false;
      rowDrag.overRemainder = false;

      $(".drag-target").each(function(index, dragTarget) {
        $(dragTarget).removeClass("drag-target");
      });
      Tapedeck.Frontend.Frame.TrackLists.rowDrag.tracks = [];
    },
    rowDragOver: function(e) {
      if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
      }
    },
    rowDrop: function(e) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;
      var rowDrag = tracklists.rowDrag;
      if (e.stopPropagation) {
        e.stopPropagation(); // stops redirecting in some cases.
      }

      var target = $(e.target).closest(".row");

      var dropIndex = parseInt(target.attr("index"), 10);

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
    remainderOver: function(e) {
      if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
      }
    },
    remainderDragEnter: function(e) {
      var rowDrag = Tapedeck.Frontend.Frame.TrackLists.rowDrag;
      rowDrag.overRemainder = true;

      // find the dropIndex and highlight the target row
      var dropIndex = -1;
      var rows = $("#queue .row[index]");
      if (rows.length !== 0) {
        rows.each(function(){
          var i = parseInt($(this).attr("index"), 10);
          if (i > dropIndex) {
            dropIndex = i;
          }
        });
        var selector = "#queue .row[index='" + dropIndex +"']";
        $(selector).parent().addClass("drag-target");
      }
      else {
        $(e.target).addClass("drag-target");
      }

    },
    remainderDragLeave: function(e) {
      // we get some incorrect dragleave events, make sure we're actually leaving
      var checkElem = document.elementFromPoint(e.originalEvent.offsetX, e.originalEvent.offsetY);
      if (!checkElem || checkElem == null) {
        return;
      }

      var rowDrag = Tapedeck.Frontend.Frame.TrackLists.rowDrag;
      rowDrag.overRemainder = false;

      // remove the highlight from the target row
      var dropIndex = -1;
      var rows = $("#queue .row[index]");
      if (rows.length !== 0) {
        rows.each(function(){
          var i = parseInt($(this).attr("index"), 10);
          if (i > dropIndex) {
            dropIndex = i;
          }
        });
        var selector = "#queue .row[index='" + dropIndex +"']";
        $(selector).parent().removeClass("drag-target");
      }
      else {
        $(e.target).removeClass("drag-target");
      }
    },
    remainderDrop: function(e) {
      var rowDrag = Tapedeck.Frontend.Frame.TrackLists.rowDrag;

      // determine the appropriate dropIndex
      var dropIndex = -1;
      var rows = $("#queue .row[index]");
      if (rows.length !== 0) {
        rows.each(function(){
          var i = parseInt($(this).attr("index"), 10);
          if (i > dropIndex) {
            dropIndex = i;
          }
        });
      }

      if (rowDrag.from.match(/queue/) != null) {
        // If dropping from queue to queue, moveTracks
        Tapedeck.Frontend.Messenger.moveTracks(rowDrag.tracks, dropIndex + 1);
      }
      else {
        // If dropping from browse to queue, queueTracks
        Tapedeck.Frontend.Messenger.queueTracks(rowDrag.tracks, dropIndex + 1);
      }
    },

    rowButtonRemove: function(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      var row = $(e.target).closest(".row");

      Tapedeck.Frontend.Messenger.removeQueuedAt($(row).attr("index"));
    },

    rowButtonPlaynow: function(e) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;
      if (e.stopPropagation) {
        e.stopPropagation();
      }

      var row = $(e.target).closest(".row");

      if ($(row).closest(".tracklist-container").attr("id") == "queue") {
        // to play immediately from the queue we can just play the row
        tracklists.playQueueRow(row);
      }
      else {
        // to play immediately from the browselist we must queueAndPlay
        Tapedeck.Frontend.Messenger.queueAndPlayNow($(row).attr("track-id"));
      }
    },

    rowButtonQueue: function(e) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      var row = $(e.target).closest(".row");

      tracklists.queueBrowseRow(row);
    },

    rowButtonDownload: function(e) {
      var tracklists = Tapedeck.Frontend.Frame.TrackLists;
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      var row = $(e.target).closest(".row");
      var trackType = $(row).attr("track-type");

      switch (trackType) {
      case "soundcloud": // TODO special soundcloud dl handling
      case "hypem": // TODO special hypem dl handling
      case "mp3":
        tracklists.download($(row).attr("track-id"));
        break;

      default:
        console.error("We cannot download this file");
        break;
      }
    },

    download: function(trackID) {
      // Download will send us a filesystem:// url when it's done and
      // we can trigger the download with a 'download' <a>.
      // We then simulate a click on that element.
      var callback = function(response) {
        var downloadLink = document.createElement("a");
        downloadLink.setAttribute("href", response.url);
        downloadLink.setAttribute("download", response.fileName);

        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", true, true);
        downloadLink.dispatchEvent(evt);
        return;
      };

      Tapedeck.Frontend.Messenger.download(trackID, callback);
    },

    showFeedSwitcher: function() {
      var content = $("#feed-switcher-content");
      $(content).css("display", "block");
    },

    hideFeedSwitcher: function() {
      var content = $("#feed-switcher-content");
      $(content).css("display", "none");
    },

    chooseFeed: function(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      var target = $(e.target).closest(".feed-row");
      var feedName = $(target).attr("feedName");
      Tapedeck.Frontend.Messenger.chooseFeed(feedName);
    },

    prevPage: function(e) {
      Tapedeck.Frontend.Messenger.browsePrevPage();
    },
    setCurrentPage: function(e) {
      $("#current-page").after("<input type='text' id='set-page' />");
      $("#current-page").hide();
      $("#set-page").keypress(function(e) {
        if(e.which == 13) {
          var value = $("#set-page").val();
          if (value.indexOf("-") != -1) {
            var words = value.split("-");
            if (words.length >= 2) {
              var startPage = parseInt(words[0], 10);
              var endPage = parseInt(words[1],10);
              Tapedeck.Frontend.Messenger.setPageRange(startPage, endPage);
            }
          }
          else {
            var page = parseInt(value, 10);
            if (!isNaN(page) && page > 0) {
              Tapedeck.Frontend.Messenger.setPage(page);
            }
          }
          $("#set-page").blur();
        }
      });
      $("#set-page").select();
      $("#set-page").blur(function(e) {
        $("#set-page").off("blur");
        $("#set-page").remove();
        $("#current-page").show();
      });
    },
    nextPage: function(e) {
      Tapedeck.Frontend.Messenger.browseNextPage();
    },

    eject: function(e) {
      Tapedeck.Frontend.Messenger.ejectCassette();
    },

    selectAll: function(e) {
      var rows = $("#browse-list").find(".tracklist").first().find(".row:not(.blank):not(.message)");

      var isDeselect = true;
      rows.each( function(i, row) {
        if(!($(row).hasClass("selected"))) {
          isDeselect = false;
          $(row).addClass("selected");
        }
      });
      if (isDeselect) {
        $(rows).removeClass("selected");
      }
    },
  },

  CassetteList: {
    rowClick: function(e) {
      var target = e.target;
      while(!$(target).hasClass("row")) {
        target = $(target).parent();
        if (target == null || !target) {
          console.error("Couldn't locate row");
          return;
        }
      }

      Tapedeck.Frontend.Messenger.setCassette($(target).attr("cassette-name"));
    },

    rowButtonRemove: function(e) {
      var target = e.target;
      while(!$(target).hasClass("row")) {
        target = $(target).parent();
        if (target == null || !target) {
          console.error("Couldn't locate row");
          return;
        }
      }
      if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
      }

      Tapedeck.Frontend.Messenger.removeCassette($(target).attr("cassette-name"));
    },

    loadLink: function(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      Tapedeck.Frontend.Messenger.loadLink($(e.target).attr("url"));
    },

    showCassetteMenu: function(e) {
      $("#add-cassettes-menu").attr("visible", "visible");
      var content = $("#add-cassettes-content");
      $(content).css("display", "block");
    },

    hideCassetteMenu: function(e) {
      $("#add-cassettes-menu").removeAttr("visible");
      var content = $("#add-cassettes-content");
      $(content).css("display", "none");
    },

    findCassettes: function(e) {
      Tapedeck.Frontend.Messenger.findCassettes();
    },

    cassettify: function(e) {
      Tapedeck.Frontend.Messenger.cassettify();
    },
  },

  PlaylistList: {
    playPlaylist: function(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      var target = $(e.target).closest(".row");
      var index = $(target).attr("index");
      Tapedeck.Frontend.Messenger.playPlaylist(index);
    },

    makePlaylist: function() {
      var playlistName = prompt("Please enter a playlist name");
      if (playlistName == null) {
        return;
      }

      Tapedeck.Frontend.Messenger.makePlaylist(playlistName);
    },

    removePlaylist: function(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      var target = $(e.target).closest(".row");
      var index = $(target).attr("index");
      Tapedeck.Frontend.Messenger.removePlaylist(index);
    },
  },

  drawerWidth: -1,
  openDrawer: function(animate, callback) {
    if (typeof(animate) != "boolean") {
      callback = animate;
      animate = true;
    }
    var frame = Tapedeck.Frontend.Frame;

    if (frame.drawerWidth <= 0) {
      frame.drawerWidth = $(".frame-box").width();

      // sometimes we beat the frame to loading, yield to it loading
      if (frame.drawerWidth <= 0) {
        setTimeout(frame.openDrawer, 0, animate, callback);
        return;
      }
    }

    // reflect the command to move all elements on screen off the backend
    Tapedeck.Frontend.Messenger.setDrawer(frame.drawerWidth, animate, function() {
      // open complete here
      if (typeof(callback) != "undefined") {
        callback();
      }
    });
  },
  closeDrawer: function(animate, callback) {
    if (typeof(animate) != "boolean") {
      callback = animate;
      animate = true;
    }

    // reflect the command to reset all moved elements off the backend
    Tapedeck.Frontend.Messenger.setDrawer(0, animate, function() {
      // close complete here
      if (typeof(callback) != "undefined") {
        callback();
      }
    });
  },


  toggleRepeat: function() {
    Tapedeck.Frontend.Messenger.toggleRepeat();
    Tapedeck.Frontend.Frame.checkRepeat();
  },

  toggleSync: function() {
    Tapedeck.Frontend.Messenger.toggleSync();
    Tapedeck.Frontend.Frame.checkSync();
  },

  shuffleQueue: function() {
    Tapedeck.Frontend.Messenger.shuffleQueue();
  },

  clearQueue: function() {
    Tapedeck.Frontend.Messenger.clearQueue();
  },

  getCSS: function() {
    Tapedeck.Frontend.Messenger.getCSS(function(response) {

      // remove all but tapedeck-base.css, the basic stylesheet
      var oldStyles = $('head').find('link');
      if (oldStyles.length > 0) {
        oldStyles.each(function(index, oldStyle) {
          if ($(oldStyle).attr("href") == response.cssURL) {
            // the css we want is already present, abort
            return;
          }

          if ($(oldStyle).attr("href").indexOf("tapedeck-base.css") == -1) {
            // remove anything that's not the basic stylesheet
            $(oldStyle).remove();
          }
        });
      }
      $('head').append('<link rel="stylesheet" href="' + response.cssURL + '" type="text/css" />');
    });
  },

  forceSeekSliderUpdate: function() {
    if (!($(".seek-slider").first().hasClass("disabled"))) {
      Tapedeck.Frontend.Messenger.requestUpdate("SeekSlider");
    }
  },

  forceVolumeSliderUpdate: function() {
    Tapedeck.Frontend.Messenger.requestUpdate("VolumeSlider");
  },

  checkDrawer: function() {
    Tapedeck.Frontend.Messenger.checkDrawer(function(response) {
      if (response.opened) {
        Tapedeck.Frontend.Frame.openDrawer(true); // animate every time
      }
      else {
        Tapedeck.Frontend.Frame.closeDrawer(true); // animate every time
      }
    });
  },
  checkRepeat: function() {
    Tapedeck.Frontend.Messenger.getRepeat(function(response) {
      if (response.repeat) {
        $("#repeat").attr("src", chrome.extension.getURL("images/repeat-on.png"));
      }
      else {
        $("#repeat").attr("src", chrome.extension.getURL("images/repeat-off.png"));
      }
    });
  },
  checkSync: function() {
    Tapedeck.Frontend.Messenger.getSync(function(response) {
      var imgPath = "images/sync-off.png";
      if (response.sync == "on") {
        imgPath = "images/sync-on.png";
      }
      else if (response.sync == "warn") {
        imgPath = "images/sync-warning.png";
      }
      else if (response.sync == "broken") {
        imgPath = "images/sync-broken.png";
      }

      $("#sync").attr("src", chrome.extension.getURL(imgPath));
    });
  },

  checkLogo: function() {
    Tapedeck.Frontend.Messenger.getLogoColor(function(response) {
      if (response.color != "clear") {
        $("#logo").css("fill", response.color);
        $("#logo").show();
      }
      else {
        $("#logo").hide();
      }
    });
  },

  logoClick: function() {
    Tapedeck.Frontend.Messenger.cycleLogo(function(response) {
      $("#logo").css("fill", response.color);
    });
  },

  logoRightClick: function() {
    Tapedeck.Frontend.Messenger.toggleLogo(function (response) {
      // newVal == "clear" indicates hiding, otherwise set to newVal
      if (response.color == "clear") {
        $("#logo").hide();
      }
      else {
        $("#logo").css("fill", response.color);
        $("#logo").show();
      }
    });
    return false;
  },

  Modal: {
    /* Modal params: {
     *  title         : "titlegoeshere",
     *  fields        : [{ type: "input"|"info",
     *                     text: "textgoeshere",
     *                     callbackParam: "paramName" <input only> },
     *                 ...],
     *
     *  <optionals>
     *  submitButtons : [{ text: "buttontexthere",
     *                     callbackParam: "paramName" }]
     * }
     *
     * aCallback will be provided null if the modal is closed.
     */
    callback: null,
    cleanup: null,
    show: function(viewString, proxyEvents, proxyImages, aCallback, aCleanup) {
      var modal = Tapedeck.Frontend.Frame.Modal;

      Tapedeck.Frontend.Utils.replaceView(viewString,
                                          proxyEvents,
                                          proxyImages);

      var inputs = $("#modal").find("input[type='text']");
      if (inputs.length > 0) {
        inputs.first().select();
      }

      modal.callback = aCallback;
      if (typeof(aCleanup) != "undefined") {
        modal.cleanup = aCleanup;
      }
    },

    submit: function(event) {
      var modal = Tapedeck.Frontend.Frame.Modal;

      var params = { };
      if (typeof(event) != "undefined") {
        params.submitButton = $(event.target).attr("callbackParam");
      }

      var inputs = $("#modal").find("input[type='text']");
      inputs.each( function(i, input) {
        params[$(input).attr('callbackParam')] = $(input).attr('value');
      });

      modal.callback(params);
      modal.close(false);
    },

    close: function(event) {
      var doCleanup = false;
      if (typeof(event) != "undefined" &&
          typeof(event.target) != "undefined" &&
          event.target.id.indexOf("close") != -1) {
        doCleanup = true;
      }

      var modal = Tapedeck.Frontend.Frame.Modal;

      $("#modal").attr("hidden", true);
      if (doCleanup && modal.cleanup != null) {
        modal.cleanup();
      }
    },

    enterPress: function(event) {
      if (event.which == 13) {
        Tapedeck.Frontend.Frame.Modal.submit();
        return false;
      }
    },
  },

  DeveloperPanel: {
    saveOptions: function(e) {
      var options = {};
      options.controlViews = $("input[name='view-control']").first().prop('checked');

      Tapedeck.Frontend.Messenger.saveDevPanelOptions(options, function() {
        Tapedeck.Frontend.Messenger.requestUpdate("DeveloperPanel");
      });
    },

    nextView: function(e) {
      if ($(e.target).hasClass("disabled")) {
        return;
      }
      Tapedeck.Frontend.Messenger.nextView();
    },
  },

  onFrameRender: function() {
    var frame = Tapedeck.Frontend.Frame;

    frame.getCSS();
    setTimeout(function() {
      frame.forceSeekSliderUpdate();
      frame.forceVolumeSliderUpdate();
      frame.checkRepeat();
      frame.checkSync();
      frame.checkDrawer();
      frame.checkLogo();
    }, 40); // defer so that the CSS can kick-in
  },

  onLoadComplete: function() {
    Tapedeck.Frontend.Messenger.requestUpdate("BrowseList");
  },
};
