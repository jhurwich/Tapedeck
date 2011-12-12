if (typeof(TapedeckInjected) == "undefined") {
  
  var TapedeckInjected = { 
  
    tapedeckFrame: null,
    init: function() {
      var htmlDOM = document.getElementsByTagName("html")[0];
      
      TapedeckInjected.tapedeckFrame = document.createElement("iframe");
      TapedeckInjected.tapedeckFrame.src =
        chrome.extension.getURL("frontend/tapedeck-frame.html");
      TapedeckInjected.tapedeckFrame.id = "tapedeck-frame";
      TapedeckInjected.tapedeckFrame.setAttribute("hidden", true);
      
      htmlDOM.appendChild(TapedeckInjected.tapedeckFrame);
  
      TapedeckInjected.injectSideButtons();
      TapedeckInjected.bringToFront();
  
      chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        if (request.action == "setDrawer") {
          if (request.opened) {
            TapedeckInjected.openDrawer();
          }
          else {
            TapedeckInjected.closeDrawer();
          }
        }
      });
      
      TapedeckInjected.checkDrawerOpened();
    },
  
    injectSideButtons: function() {
      var htmlDOM = document.getElementsByTagName("html")[0];
       
      var sideButtons = document.createElement('tapedeck-buttonbox');
      sideButtons.id = 'tapedeck-injected-buttons';
      
      var drawerOpen = document.createElement('tapedeck-button');
      drawerOpen.id = 'tapedeck-injected-draweropen';
      drawerOpen.className = 'tapedeck-injected-button';
      drawerOpen.style.backgroundImage =
        "url('" + chrome.extension.getURL("images/draweropen-button.png") + "')";
      drawerOpen.onclick = TapedeckInjected.setDrawerOpened;
  
      var drawerClose = document.createElement('tapedeck-button');
      drawerClose.id = 'tapedeck-injected-drawerclose';
      drawerClose.className = 'tapedeck-injected-button';
      drawerClose.style.backgroundImage =
        "url('" + chrome.extension.getURL("images/drawerclose-button.png") + "')";
      drawerClose.onclick = TapedeckInjected.setDrawerClosed;
      drawerClose.setAttribute("hidden", true);
    
      var play = document.createElement('tapedeck-button');
      play.id = 'tapedeck-injected-play';
      play.className = 'tapedeck-injected-button';
      play.style.backgroundImage =
        "url('" + chrome.extension.getURL("images/play-pause-button.png") + "')";
      play.onclick = TapedeckInjected.playPause;
    
      var next = document.createElement('tapedeck-button');
      next.id = 'tapedeck-injected-next';
      next.className = 'tapedeck-injected-button';
      next.style.backgroundImage =
        "url('" + chrome.extension.getURL("images/next-button.png") + "')";
      next.onclick = TapedeckInjected.next;
    
      var prev = document.createElement('tapedeck-button');
      prev.id = 'tapedeck-injected-prev';
      prev.className = 'tapedeck-injected-button';
      prev.style.backgroundImage =
        "url('" + chrome.extension.getURL("images/prev-button.png") + "')";
      prev.onclick = TapedeckInjected.prev;
    
      sideButtons.appendChild(drawerOpen);
      sideButtons.appendChild(drawerClose);
      sideButtons.appendChild(play);
      sideButtons.appendChild(next);
      sideButtons.appendChild(prev);
    
      htmlDOM.appendChild(sideButtons);
    },
  
    bringToFront: function() {
      var maxZ = -1;
      $("*").each(function(index, elem) {
        var z = $(elem).css("z-index");
        z = parseInt(z);
        if (z != "NaN" && z > maxZ) {
          maxZ = z;
        }
      });
      $("#tapedeck-frame").css("z-index", maxZ + 1);
      $("#tapedeck-injected-buttons").css("z-index", maxZ + 1);
    },
    
    toolbarWidth: 351,
    openDrawer: function() {
      if (!TapedeckInjected.tapedeckFrame.getAttribute("hidden")) {
        // already opened, abort
        return;
      }
      
      TapedeckInjected.tapedeckFrame.removeAttribute("hidden");
  
      var drawerOpen = document.getElementById("tapedeck-injected-draweropen");
      drawerOpen.setAttribute("hidden", true);
    
      var drawerClose = document.getElementById("tapedeck-injected-drawerclose");
      drawerClose.removeAttribute("hidden");
    
      bodyDOM = document.getElementsByTagName("body")[0];
      bodyDOM.setAttribute("tapedeck-opened", true);
    
      TapedeckInjected.moveFixedElements();
    },
  
    closeDrawer: function() {
      if (TapedeckInjected.tapedeckFrame.getAttribute("hidden")) {
        // already closed, abort
        return
      }
      
      TapedeckInjected.tapedeckFrame.setAttribute("hidden", true);
  
      var drawerClose = document.getElementById("tapedeck-injected-drawerclose");
      drawerClose.setAttribute("hidden", true);
    
      var drawerOpen = document.getElementById("tapedeck-injected-draweropen");
      drawerOpen.removeAttribute("hidden");
      
      bodyDOM = document.getElementsByTagName("body")[0];
      bodyDOM.removeAttribute("tapedeck-opened");
      
      TapedeckInjected.resetFixedElements();
    },
    
    checkDrawerOpened: function() {
      chrome.extension.sendRequest({action: "checkDrawer"}, function(response){
        if (response.opened) {
          TapedeckInjected.openDrawer();
        }
        else {
          TapedeckInjected.closeDrawer();
        }
      });
    },
  
    setDrawerOpened: function() {
      TapedeckInjected.openDrawer();
      chrome.extension.sendRequest({ action: "setDrawer",
                                     opened: true });
    },
  
    setDrawerClosed: function() {
      TapedeckInjected.closeDrawer();
      chrome.extension.sendRequest({ action: "setDrawer",
                                     opened: false });
    },
  
    moveFixedElements: function() {
      $("*").each(function(index, elem) {
        if($(elem).css("position") == "fixed" &&
           $(elem).attr("tdMoved") != "true" &&
           $(elem).attr("id") != "tapedeck-frame") {
             
          var right = $(elem).css("right");
          var oldSpot = right ? parseInt(right) : 0;
          var newSpot = oldSpot + TapedeckInjected.toolbarWidth;
          $(elem).css("right", newSpot);
          $(elem).attr("tdMoved", true);
        }
      });
    },
  
    resetFixedElements: function() {
      $("*").each(function(index, elem) {
        if($(elem).attr("tdMoved") == "true") {
          var right = $(elem).css("right");
          var newSpot = right ? parseInt(right) : TapedeckInjected.toolbarWidth;
          var oldSpot = newSpot - TapedeckInjected.toolbarWidth;
          $(elem).css("right", oldSpot);
          $(elem).removeAttr("tdMoved");
        }
      });
    },
    
    playPause: function() {
      chrome.extension.sendRequest({action: "play_pause"});
    },
    next: function() {
      chrome.extension.sendRequest({action: "next"});
    },
    prev: function() {
      chrome.extension.sendRequest({action: "prev"});
    },
  
    isTest: function() {
      var match = window.location.href.match(/chrome-extension.*SpecRunner.html$/);
      return (match != null);
    },
  }
  
  TapedeckInjected.init();
}
