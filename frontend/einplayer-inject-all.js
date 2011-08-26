var EinInjected = { 

  einplayerFrame: null,
  init: function() {
    
    var htmlDOM = document.getElementsByTagName("html")[0];
    
    EinInjected.einplayerFrame = document.createElement("iframe");
    EinInjected.einplayerFrame.src =
      chrome.extension.getURL("frontend/einplayer.html");
    EinInjected.einplayerFrame.id = "einplayer-frame";
    EinInjected.einplayerFrame.setAttribute("hidden", true);
    
    htmlDOM.appendChild(EinInjected.einplayerFrame);

    EinInjected.injectSideButtons();
  },

  injectSideButtons: function() {
    var htmlDOM = document.getElementsByTagName("html")[0];
     
    var sideButtons = document.createElement('div');
    sideButtons.id = 'ein-injected-buttons';
    
    var drawerOpen = document.createElement('img');
    drawerOpen.id = 'ein-injected-draweropen';
    drawerOpen.className = 'ein-injected-button';
    drawerOpen.src = chrome.extension.getURL("images/pink-draweropen-button.png");
    drawerOpen.onclick = EinInjected.openDrawer;

    var drawerClose = document.createElement('img');
    drawerClose.id = 'ein-injected-drawerclose';
    drawerClose.className = 'ein-injected-button';
    drawerClose.src = chrome.extension.getURL("images/pink-drawerclose-button.png");
    drawerClose.onclick = EinInjected.closeDrawer;
    drawerClose.setAttribute("hidden", true);
  
    var play = document.createElement('img');
    play.id = 'ein-injected-play';
    play.className = 'ein-injected-button';
    play.src = chrome.extension.getURL("images/pink-play-button.png");
    play.onclick = EinInjected.play;
  
    var next = document.createElement('img');
    next.id = 'ein-injected-next';
    next.className = 'ein-injected-button';
    next.src = chrome.extension.getURL("images/pink-next-button.png");
    next.onclick = EinInjected.next;
  
    var prev = document.createElement('img');
    prev.id = 'ein-injected-prev';
    prev.className = 'ein-injected-button';
    prev.src = chrome.extension.getURL("images/pink-prev-button.png");
    prev.onclick = EinInjected.prev;
  
    sideButtons.appendChild(drawerOpen);
    sideButtons.appendChild(drawerClose);
    sideButtons.appendChild(play);
    sideButtons.appendChild(next);
    sideButtons.appendChild(prev);
  
    htmlDOM.appendChild(sideButtons);
  },
  
  toolbarWidth: 350,
  openDrawer: function() {
    EinInjected.einplayerFrame.removeAttribute("hidden");

    var drawerOpen = document.getElementById("ein-injected-draweropen");
    drawerOpen.setAttribute("hidden", true);
  
    var drawerClose = document.getElementById("ein-injected-drawerclose");
    drawerClose.removeAttribute("hidden");
  
    bodyDOM = document.getElementsByTagName("body")[0];
    bodyDOM.setAttribute("einplayer-opened", true);
  
    EinInjected.moveFixedElements();
  },
  
  //kudos to StumbleUpon
  moveFixedElements: function() {
    var allDivs = document.getElementsByTagName("div");
    for(var i=0; i<allDivs.length; i++) {
      var div = allDivs[i];
      if(!div.einMoved) {
        var style = window.getComputedStyle(div);
        if(style.position == "fixed") {
          var right = style.right;
          var oldSpot = right ? parseInt(right) : 0;
          var newSpot = oldSpot + EinInjected.toolbarWidth;
          div.style.right = newSpot + "px";
          div.einMoved = true;    
        }
      }
    }
  },

  closeDrawer: function() {
    EinInjected.einplayerFrame.setAttribute("hidden", true);

    var drawerClose = document.getElementById("ein-injected-drawerclose");
    drawerClose.setAttribute("hidden", true);
  
    var drawerOpen = document.getElementById("ein-injected-draweropen");
    drawerOpen.removeAttribute("hidden");
    
    bodyDOM = document.getElementsByTagName("body")[0];
    bodyDOM.removeAttribute("einplayer-opened");
    
    EinInjected.resetFixedElements();
  },

  resetFixedElements: function() {
    var allDivs = document.getElementsByTagName("div");
    for(var i=0; i<allDivs.length; i++) {
      var div = allDivs[i];
      if(div.einMoved) {
        var style = window.getComputedStyle(div);
        if(style.position == "fixed") {
          var right = style.right;
          var newSpot = right ? parseInt(right) : EinInjected.toolbarWidth;
          var oldSpot = newSpot - EinInjected.toolbarWidth;
          div.style.right = oldSpot + "px";
          div.einMoved = null;    
        }
      }
    }
  },
  
  
  play: function() {
    alert("play");
  },
  next: function() {
    alert("next");
  },
  prev: function() {
    alert("prev");
  },
}

window.onload = EinInjected.init;
