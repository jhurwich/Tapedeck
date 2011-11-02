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
     
    var sideButtons = document.createElement('div');
    sideButtons.id = 'tapedeck-injected-buttons';
    
    var drawerOpen = document.createElement('img');
    drawerOpen.id = 'tapedeck-injected-draweropen';
    drawerOpen.className = 'tapedeck-injected-button';
    drawerOpen.src = chrome.extension.getURL("images/draweropen-button.png");
    drawerOpen.onclick = TapedeckInjected.setDrawerOpened;

    var drawerClose = document.createElement('img');
    drawerClose.id = 'tapedeck-injected-drawerclose';
    drawerClose.className = 'tapedeck-injected-button';
    drawerClose.src = chrome.extension.getURL("images/drawerclose-button.png");
    drawerClose.onclick = TapedeckInjected.setDrawerClosed;
    drawerClose.setAttribute("hidden", true);
  
    var play = document.createElement('img');
    play.id = 'tapedeck-injected-play';
    play.className = 'tapedeck-injected-button';
    play.src = chrome.extension.getURL("images/play-pause-button.png");
    play.onclick = TapedeckInjected.playPause;
  
    var next = document.createElement('img');
    next.id = 'tapedeck-injected-next';
    next.className = 'tapedeck-injected-button';
    next.src = chrome.extension.getURL("images/next-button.png");
    next.onclick = TapedeckInjected.next;
  
    var prev = document.createElement('img');
    prev.id = 'tapedeck-injected-prev';
    prev.className = 'tapedeck-injected-button';
    prev.src = chrome.extension.getURL("images/prev-button.png");
    prev.onclick = TapedeckInjected.prev;
  
    sideButtons.appendChild(drawerOpen);
    sideButtons.appendChild(drawerClose);
    sideButtons.appendChild(play);
    sideButtons.appendChild(next);
    sideButtons.appendChild(prev);
  
    htmlDOM.appendChild(sideButtons);
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
  
  //kudos to StumbleUpon
  moveFixedElements: function() {
    var allDivs = document.getElementsByTagName("div");
    for(var i=0; i<allDivs.length; i++) {
      var div = allDivs[i];
      if(!div.tdMoved) {
        var style = window.getComputedStyle(div);
        if(style.position == "fixed") {
          var right = style.right;
          var oldSpot = right ? parseInt(right) : 0;
          var newSpot = oldSpot + TapedeckInjected.toolbarWidth;
          div.style.right = newSpot + "px";
          div.tdMoved = true;    
        }
      }
    }
  },

  resetFixedElements: function() {
    var allDivs = document.getElementsByTagName("div");
    for(var i=0; i<allDivs.length; i++) {
      var div = allDivs[i];
      if(div.tdMoved) {
        var style = window.getComputedStyle(div);
        if(style.position == "fixed") {
          var right = style.right;
          var newSpot = right ? parseInt(right) : TapedeckInjected.toolbarWidth;
          var oldSpot = newSpot - TapedeckInjected.toolbarWidth;
          div.style.right = oldSpot + "px";
          div.tdMoved = null;    
        }
      }
    }
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

window.onload = TapedeckInjected.init;
