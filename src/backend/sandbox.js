if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
}

Tapedeck.Sandbox = {

  cassettes: {},

  messageHandler: function(e) {
    var message = e.data;
    var response = Tapedeck.Sandbox.newResponse(message);

    switch(message.action)
    {
      case "render":
        response.el = Tapedeck.Sandbox.render(message.textTemplate, message.params);
        window.parent.postMessage(response, "*");
        break;

      case "prepCassette":
        Tapedeck.Sandbox.prepCassette(message.url, function(report) {
          response.report = report;
          window.parent.postMessage(response, "*");
        });
        break;

      case "getBrowseList":
        var cassette = Tapedeck.Sandbox.cassettes[message.tdID];
        cassette.getBrowseList(message.params.context, function(tracks) {

          // success callback
          response.tracks = tracks;
          window.parent.postMessage(response, "*");
        }, function(error) {

          // error callback
          response.error = error;
          window.parent.postMessage(response, "*");
        });
        console.log("getBrowseList for " + cassette.get("name"));
        break;

      case "getPage":
        var cassette = Tapedeck.Sandbox.cassettes[message.tdID];
        cassette.getPage(message.params.page, message.params.context, function(tracks) {

          // success callback
          response.tracks = tracks;
          window.parent.postMessage(response, "*");
        }, function(error) {

          // error callback
          response.error = error;
          window.parent.postMessage(response, "*");
        });
        break;

      default:
        throw new Error("Tapedeck.Sandbox was sent an unknown action");
        break;
    }
  },

  render: function(textTemplate, params) {
    var template = _.template(textTemplate);
    return template({ params: params });
  },

  prepCassette: function(url, callback) {

    // register the names of the cassettes that we currently have, so we can detect the new one
    var existingCassettes = { };
    for (var cassetteName in Tapedeck.Sandbox.Cassettes) {
      existingCassettes[cassetteName] = true;
    }

    // writes the cassette to Tapedeck.Sandbox.Cassettes[CassetteName]
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', url);
    document.getElementsByTagName('head')[0].appendChild(script);

    var currTimeout = 0;
    var continueLoad = function() {
      // find out which cassette, if any, is new
      var newCassetteName = "";
      for (var cassetteName in Tapedeck.Sandbox.Cassettes) {
        if (!(cassetteName in existingCassettes)) {
          newCassetteName = cassetteName;
          break;
        }
      }

      // if the cassette has loaded, attach it and return; if not, keep waiting
      if (newCassetteName != "" && typeof(Tapedeck.Sandbox.Cassettes[newCassetteName]) != "undefined") {
        // Cassette has loaded.  Get a handle on it and return its report
        var newCassette = new Tapedeck.Sandbox.Cassettes[newCassetteName]();
        Tapedeck.Sandbox.cassettes[newCassette.get("tdID")] = newCassette;
        callback(newCassette.generateReport());      }
      else {
        // not loaded yet
        if (currTimeout <= 0) {
          currTimeout = 1;
        }
        currTimeout = currTimeout * 2;
        setTimeout(continueLoad, currTimeout);
      }
    }
    continueLoad();
  },

  newResponse: function(message, object) {
    var response = (object ? object : { });
    response.type = "response";

    if ("callbackID" in message) {
      response.callbackID = message.callbackID;
    }
    return response;
  },
};

// Cassettes will expect Backend to exist, map it to the Sandbox
if (typeof Tapedeck.Backend == "undefined") {
  Tapedeck.Backend = Tapedeck.Sandbox;
  Tapedeck.Sandbox.Models = { };
  Tapedeck.Sandbox.Cassettes = { };

  // we capture and simulate Tapedeck.Backend.MessageHandler.addTracks
  Tapedeck.Backend.MessageHandler = {
    addTracks: function(tracks, tab) {

      var message = {
        action : "addTracks",
        tracks : tracks
      }
      if (typeof(tab) != "undefined") {
        message.tab = tab;
      }
      window.parent.postMessage(message, "*");
    }
  };
}

// copied wholesale from prototype.js, props to them
Function.prototype.curry = function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  if (!arguments.length) return this;
  var __method = this, args = slice.call(arguments, 0);
  return function() {
    var a = merge(args, arguments);
    return __method.apply(this, a);
  }
};

window.addEventListener('message', Tapedeck.Sandbox.messageHandler);
