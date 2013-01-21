if (typeof(Tapedeck) == "undefined") {
  var Tapedeck = { };
}
if (typeof(Tapedeck.Options) == "undefined") {
  Tapedeck.Options = {

    init: function() {
      Tapedeck.Frontend.Messenger.init();

      // Get Options, self-populated, from the default package, callback above
      Tapedeck.Frontend
              .Messenger
              .requestUpdate("Options");
    },

    submit: function() {
      var options = {};
      var inputs = $("input.number, input.string");
      inputs.each(function(index, elem) {
        var key = Tapedeck.Options.rebuildKey(elem);
        options[key] = $(elem).val();
        if (index == inputs.length - 1) {
          Tapedeck.Frontend.Messenger.saveOptions(options, function() {
            Tapedeck.Options.flash();
          });
        }
      });
    },

    rebuildKey: function(elem) {
      var currElem = elem;
      var findSpans = $(currElem).siblings("span.key");
      var key = "key"; // all keys end with 'key'
      while (findSpans.length > 0) {
        key = $(findSpans[0]).html() + "-" + key;

        currElem = $(currElem).parent();
        findSpans = $(currElem).siblings("span.key");
      }
      return key;
    },

    runtests: function() {
      Tapedeck.Frontend.Messenger.runTests();
      Tapedeck.Options.flash();
    },

    reset: function() {
      Tapedeck.Frontend.Messenger.clear(function() {
        Tapedeck.Options.flash();
      });
    },

    selectAll: function() {
      if (this.hasAttribute("is-selected")) {
        return;
      }
      if ($(this).val().indexOf(",") == -1) {
        this.select();
        $(this).attr("is-selected", true);
        $(this).blur(function() {
          $(this).removeAttr("is-selected");
        });
      }
    },

    flash: function() {
      /* props to http://www.nixtu.info/2011/08/html5-canvas-gradients-rectangular.html */
      // ======= utility methods =======
      function gradient(dir) {
        var grad = ctx.createLinearGradient(dir[0], dir[1], dir[2], dir[3]);

        grad.addColorStop(0, outerColor);
        grad.addColorStop(0.05, innerColor);
        grad.addColorStop(0.95, innerColor);
        grad.addColorStop(1.0, outerColor);

        return grad;
      }

      function background() {
        ctx.fillStyle = gradient([0, 0, 0, h]);
        ctx.fillRect(0, 0, w, h);
      }

      function bow() {
        ctx.save();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.clip();

        ctx.fillStyle = gradient([0, 0, w, 0]);
        ctx.fillRect(0, 0, w, h);

        ctx.restore();
      }
      // ======= end utility methods =======

      var canvas = document.getElementById("flash");

      if (!canvas.hasAttribute("populated")) {
        $(canvas).hide();
        var ctx = canvas.getContext("2d");

        var outerColor = 'rgba(188,188,188,1)';
        var innerColor = 'rgba(188,188,188,0)';

        var w = window.innerWidth;
        var h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;

        background();
        bow();
        canvas.setAttribute("populated", true);
      }
      $(canvas).fadeIn(200, function() {
        $(canvas).fadeOut(600);
      });
    },
  };
}

$(document).ready(function() {
  Tapedeck.Options.init();
});
