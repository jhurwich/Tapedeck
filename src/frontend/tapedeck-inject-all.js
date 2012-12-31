if (typeof(TapedeckInjected) == "undefined") {

  var TapedeckInjected = {

    tapedeckFrame: null,
    init: function() {
      var htmlDOM = document.getElementsByTagName("html")[0];

      if (document.getElementById("tapedeck-frame") != null) {
        // We're already injected, not sure how this happened with the
        // TapedeckInjected check, but abort.
        return;
      }

      TapedeckInjected.tapedeckFrame = document.createElement("iframe");
      TapedeckInjected.tapedeckFrame.src =
        chrome.extension.getURL("frontend/tapedeck-frame.html");
      TapedeckInjected.tapedeckFrame.id = "tapedeck-frame";
      TapedeckInjected.tapedeckFrame.setAttribute("hidden", true);

      htmlDOM.appendChild(TapedeckInjected.tapedeckFrame);

      TapedeckInjected.injectSideButtons();
      TapedeckInjected.bringToFront();

      chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {

        switch(request.action)
        {
          case "executeScriptAgain":
            var script = request.script;
            var scriptFile = script.replace("frontend/scripts/", "");
            scriptFile = scriptFile.replace(".js", "");

            var words = scriptFile.split("-");
            var scriptName = "";
            for (var i = 0; i < words.length; i++) {
              scriptName += words[i].charAt(0).toUpperCase() +
                            words[i].slice(1);
            }

            if (typeof(request.params) != "undefined") {
              TapedeckInjected[scriptName].start(request.params);
            }
            else {
              TapedeckInjected[scriptName].start();
            }
            break;

          case "setDrawer":
            if (request.opened) {
              TapedeckInjected.openDrawer();
            }
            else {
              TapedeckInjected.closeDrawer();
            }
            break;

          default:
            console.error("TapedeckInjected's requestHandler was sent an unknown action '" + request.action + "'");
            break;
        }
      });

      var finishInit = function() {
        if (typeof(TapedeckInjected.Utils) == "undefined") {
          setTimeout(finishInit, 100);
          return;
        }
        TapedeckInjected.checkDrawerOpened();
      };

      finishInit();
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
        z = parseInt(z, 10);
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

      var bodyDOM = document.getElementsByTagName("body")[0];
      bodyDOM.setAttribute("tapedeck-opened", true);

      TapedeckInjected.moveFixedElements();
    },

    closeDrawer: function() {
      if (TapedeckInjected.tapedeckFrame.getAttribute("hidden")) {
        // already closed, abort
        return;
      }

      TapedeckInjected.tapedeckFrame.setAttribute("hidden", true);

      var drawerClose = document.getElementById("tapedeck-injected-drawerclose");
      drawerClose.setAttribute("hidden", true);

      var drawerOpen = document.getElementById("tapedeck-injected-draweropen");
      drawerOpen.removeAttribute("hidden");

      var bodyDOM = document.getElementsByTagName("body")[0];
      bodyDOM.removeAttribute("tapedeck-opened");

      TapedeckInjected.resetFixedElements();
    },

    checkDrawerOpened: function() {
      var request = TapedeckInjected.Utils.newRequest({action: "checkDrawer"});

      // it's a bit strange that this uses sendResponse rather than a callbackID
      chrome.extension.sendRequest(request, function(response){
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
      var request = TapedeckInjected.Utils.newRequest({ action: "setDrawer", opened: true });
      chrome.extension.sendRequest(request);
    },

    setDrawerClosed: function() {
      TapedeckInjected.closeDrawer();
      var request = TapedeckInjected.Utils.newRequest({ action: "setDrawer", opened: false });
      chrome.extension.sendRequest(request);
    },

    moveFixedElements: function() {
      $("*").each(function(index, elem) {
        if($(elem).css("position") == "fixed" &&
           $(elem).attr("tdMoved") != "true" &&
           $(elem).attr("id") != "tapedeck-frame") {

          var right = $(elem).css("right");
          if (right != "auto") {
            var oldSpot = right ? parseInt(right, 10) : 0;
            var newSpot = oldSpot + TapedeckInjected.toolbarWidth;
            $(elem).css("right", newSpot);
            $(elem).attr("tdMoved", true);
            return;
          }

          var elemWidth = $(elem).width();
          if (elemWidth >= document.body.clientWidth - TapedeckInjected.toolbarWidth) {
            $(elem).width(elemWidth - TapedeckInjected.toolbarWidth);
            $(elem).attr("tdShrunk", elemWidth);
          }
        }
      });
    },

    resetFixedElements: function() {
      $("*").each(function(index, elem) {
        if($(elem).attr("tdMoved") == "true") {
          var right = $(elem).css("right");
          var newSpot = right ? parseInt(right, 10) : TapedeckInjected.toolbarWidth;
          var oldSpot = newSpot - TapedeckInjected.toolbarWidth;
          $(elem).css("right", oldSpot);
          $(elem).removeAttr("tdMoved");
        }
        var originalWidth = $(elem).attr("tdShrunk");
        if(typeof(originalWidth) != "undefined") {
          $(elem).width(originalWidth);
          $(elem).removeAttr("tdShrunk");
        }
      });
    },

    playPause: function() {
      var request = TapedeckInjected.Utils.newRequest({action: "play_pause"});
      chrome.extension.sendRequest(request);
    },
    next: function() {
      var request = TapedeckInjected.Utils.newRequest({action: "next"});
      chrome.extension.sendRequest(request);
    },
    prev: function() {
      var request = TapedeckInjected.Utils.newRequest({action: "prev"});
      chrome.extension.sendRequest(request);
    },

    isTest: function() {
      var match = window.location.href.match(/chrome-extension.*SpecRunner.html$/);
      return (match != null);
    }
  };

  TapedeckInjected.init();
}
