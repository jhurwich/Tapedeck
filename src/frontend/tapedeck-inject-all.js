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

      htmlDOM.appendChild(TapedeckInjected.tapedeckFrame);

      TapedeckInjected.bringToFront();

      chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        switch(request.action) {
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
          TapedeckInjected.setDrawer(request.width, request.animate);
          sendResponse();
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
      };

      finishInit();
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
    },

    setDrawer: function(width, animate) {
      if (animate && !$("#tapedeck-frame").hasClass("animate")) {
        $("#tapedeck-frame").addClass("animate");
      }
      else if (!animate && $("#tapedeck-frame").hasClass("animate")) {
        $("#tapedeck-frame").removeClass("animate");
      }

      if (width > 0) {
        var bodyDOM = document.getElementsByTagName("body")[0];
        bodyDOM.setAttribute("tapedeck-opened", true);

        TapedeckInjected.moveFixedElements(width);

        $("#tapedeck-frame").addClass("open");
      }
      else {
        var bodyDOM = document.getElementsByTagName("body")[0];
        bodyDOM.removeAttribute("tapedeck-opened");

        TapedeckInjected.resetFixedElements();

        $("#tapedeck-frame").removeClass("open");
      }
    },

    widthMoved: -1,
    moveFixedElements: function(width) {
      $("*").each(function(index, elem) {
        if($(elem).css("position") == "fixed" &&
           $(elem).attr("tdMoved") != "true" &&
           $(elem).attr("id") != "tapedeck-frame") {

          var right = $(elem).css("right");
          if (right != "auto") {
            var oldSpot = right ? parseInt(right, 10) : 0;
            var newSpot = oldSpot + width;
            $(elem).css("right", newSpot);
            $(elem).attr("tdMoved", true);
            return;
          }

          var elemWidth = $(elem).width();
          if (elemWidth >= document.body.clientWidth - width) {
            $(elem).width(elemWidth - width);
            $(elem).attr("tdShrunk", elemWidth);
          }
        }
      });
      TapedeckInjected.widthMoved = width;
    },

    resetFixedElements: function() {
      if (TapedeckInjected.widthMoved > 0) {
        $("*").each(function(index, elem) {
          if($(elem).attr("tdMoved") == "true") {
            var right = $(elem).css("right");
            var newSpot = right ? parseInt(right, 10) : TapedeckInjected.widthMoved;
            var oldSpot = newSpot - TapedeckInjected.widthMoved;
            $(elem).css("right", oldSpot);
            $(elem).removeAttr("tdMoved");
          }
          var originalWidth = $(elem).attr("tdShrunk");
          if(typeof(originalWidth) != "undefined") {
            $(elem).width(originalWidth);
            $(elem).removeAttr("tdShrunk");
          }
        });
      }
    },

    isTest: function() {
      var match = window.location.href.match(/chrome-extension.*SpecRunner.html$/);
      return (match != null);
    }
  };

  TapedeckInjected.init();
}
