if (typeof(Tapedeck) == "undefined") {
  var Tapedeck = { };
}
if (typeof(Tapedeck.Options) == "undefined") {
  Tapedeck.Options = {

    init: function() {
      Tapedeck.Frontend.Messenger.init();

      var callback = function(response) {
        Tapedeck.Frontend.Utils.replaceView(response.view,
                                            response.proxyEvents);
      };

      // Get Options, self-populated, from the default package, callback above, and postPopulate it
      Tapedeck.Frontend
              .Messenger
              .getView("Options", null, null, callback, false);
    },

    submit: function() {
      var options = {};
      var inputs = $("input.number, input.string");
      inputs.each(function(index, elem) {
        var key = Tapedeck.Options.rebuildKey(elem);
        options[key] = $(elem).val();
        if (index == inputs.length - 1) {
          Tapedeck.Frontend.Messenger.saveOptions(options, function() { });
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
    },

    reset: function() {
      Tapedeck.Frontend.Messenger.clear(function() { });
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
    }
  };
}

$(document).ready(function() {
  Tapedeck.Options.init();
});
