if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
}

Tapedeck.Sandbox = {

  // The sandbox div gets blown away on background.html when we append new templates,
  // so init() is called each time to re-establish the Sandbox with things like logLevels.
  init: function() {
    // we've established Backend for Utils, swing that onto Sandbox
    var utils = Tapedeck.Backend.Utils;

    Tapedeck.Backend = Tapedeck.Sandbox;
    Tapedeck.Sandbox.Models = { };
    Tapedeck.Sandbox.Cassettes = { };
    Tapedeck.Sandbox.Utils = utils;

    // we capture and simulate Tapedeck.Backend.MessageHandler.addTracks
    Tapedeck.Backend.MessageHandler = {
      addTracks: function(tracks, tab) {
        Tapedeck.Sandbox.log("Sandbox is adding tracks: " + JSON.stringify(tracks),
                             Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

        var message = {
          action : "addTracks",
          tracks : tracks
        }
        if (typeof(tab) != "undefined") {
          message.tab = tab;
        }
        Tapedeck.Sandbox.sendMessage(message, "*");
      }
    };

    var request = {
      action : "getLogLevels",
    };
    Tapedeck.Sandbox.sendMessage(request);

    Tapedeck.ajax = Tapedeck.Sandbox.ajax;
  },

  messageHandler: function(e) {
    var message = e.data;
    if (message.action == "response") {
      Tapedeck.Sandbox.responseHandler(message);
      return;
    }

    var response = Tapedeck.Sandbox.newResponse(message);
    Tapedeck.Sandbox.log("Sandbox received message: " + message.action);

    switch(message.action)
    {
      case "render":
      case "template":
        Tapedeck.Sandbox.log("Rendering '" + message.templateName + "' with params: " + JSON.stringify(message.params));

        response.rendered = Tapedeck.Sandbox.render(message.textTemplate, message.params);
        Tapedeck.Sandbox.sendMessage(response);
        break;

      case "testPattern":
        Tapedeck.Sandbox.log("Testing pattern '" + message.params.pattern + "'");
        var code = Tapedeck.Sandbox.render(message.textTemplate, message.params);
        var testCassetteName = "TestCassette";
        code = code.replace(/CassetteFromTemplate/g, testCassetteName);
        code = code.replace(/Unnamed/g, testCassetteName);

        var cleanup = function() {
          delete Tapedeck.Sandbox.Cassettes[testCassetteName];
        }

        response.success = false;
        Tapedeck.Sandbox.prepCassette(code, function(report) {
          var cassette = Tapedeck.Sandbox.cassettes[report.tdID];
          cassette.getBrowseList(message.context, function(aResponse) {
            // success callback

            if (aResponse.tracks.length > 0) {
              // no error, but make sure we got tracks.  Wait for Soundcloud tracks if not
              response.success = true;
              response.report = report;
              for (var param in aResponse) {
                response[param] = aResponse[param];
              }

              cleanup();
              Tapedeck.Sandbox.sendMessage(response);
            }
          }, function(error) {
            // error callback

            response.success = false;
            cleanup();
            Tapedeck.Sandbox.sendMessage(response);
          }, function(final) {

            // final callback
            var finalResponse = Tapedeck.Sandbox.newResponse(message);
            finalResponse.success = final.success;
            cleanup();
            Tapedeck.Sandbox.sendMessage(finalResponse);
          });
        });
        break;

      case "prepCassette":
        Tapedeck.Sandbox.prepCassette(message.code, function(report) {
          response.report = report;
          Tapedeck.Sandbox.sendMessage(response);
        });
        break;

      case "clearCassettes":
        Tapedeck.Sandbox.clearCassettes();
        Tapedeck.Sandbox.sendMessage(response);
        break;

      case "getBrowseList":
        var cassette = Tapedeck.Sandbox.cassettes[message.tdID];
        cassette.getBrowseList(message.params.context, function(params) {

          // success callback
          for (var p in params) {
            response[p] = params[p];
          }
          Tapedeck.Sandbox.sendMessage(response);
        }, function(error) {

          // error callback
          response.error = error;
          Tapedeck.Sandbox.sendMessage(response);
        }, function(final) {

          // final callback
          var finalResponse = Tapedeck.Sandbox.newResponse(message);
          for (var p in final) {
            finalResponse[p] = final[p];
          }
          finalResponse.final = true;

          Tapedeck.Sandbox.sendMessage(finalResponse);
        });
        break;

      case "getPage":
        var cassette = Tapedeck.Sandbox.cassettes[message.tdID];
        cassette.getPage(message.params.page, message.params.context, function(params) {

          // success callback
          for (var p in params) {
            response[p] = params[p];
          }
          Tapedeck.Sandbox.sendMessage(response);
        }, function(error) {

          // error callback
          response.error = error;
          Tapedeck.Sandbox.sendMessage(response);
        }, function(final) {

          // final callback
          var finalResponse = Tapedeck.Sandbox.newResponse(message);
          for (var param in final) {
            finalResponse[param] = final[param];
          }
          finalResponse.final = true;

          Tapedeck.Sandbox.sendMessage(finalResponse);
        });
        break;

      case "setLogs":
        Tapedeck.Backend.Utils.setLogs(message.logs, true);
        if (typeof(message.callbackID) != "undefined") {
          var aResponse = Tapedeck.Sandbox.newResponse(message);
          Tapedeck.Sandbox.sendMessage(aResponse);
        }
        break;

      default:
        throw new Error("Tapedeck.Sandbox was sent an unknown action");
        break;
    }
  },

  render: function(textTemplate, params) {
    Tapedeck.Sandbox.log("Rendering: \n" + textTemplate + "\n with " + JSON.stringify(params),
                         Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);
    var template = _.template(textTemplate);

    if (Tapedeck.Sandbox.debug > Tapedeck.Backend.Utils.DEBUG_LEVELS.BASIC) {
      var debugMethods = {
        paramSanity: function(paramName, necessary, checkValue) {
          var str = ">>>==============> ";
          str += paramName + " is " + (necessary ? "necessary" : "optional");

          var checkHasValue = true;
          if (typeof(checkValue) == "undefined") {
            checkValue = "undefined";
            checkHasValue = false;
          }
          else if (checkValue == null) {
            checkValue = "Null";
            checkHasValue = false
          }
          str += " and we got " + JSON.stringify(checkValue);

          if (necessary && !checkHasValue) {
            console.error(str);
          }
          else {
            console.log(str);
          }
        },
      }

      params.debug = Tapedeck.Sandbox.debug;
      _.extend(params, debugMethods);
    }
    else {
      params.debug = 0;
    }
    return template({ params: params });
  },

  prepCassette: function(code, callback) {
    Tapedeck.Sandbox.log("Preparing a new cassette");

    // register the names of the cassettes that we currently have, so we can detect the new one
    var existingCassettes = { };
    for (var cassetteName in Tapedeck.Sandbox.Cassettes) {
      existingCassettes[cassetteName] = true;
    }

    eval(code);

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

      Tapedeck.Sandbox.log("The new cassette '" + newCassetteName + "' is ready.");
      callback(newCassette.generateReport());
    }
    else {
      Tapedeck.Sandbox.log("THE CASSETTE WAS NOT PREPARED PROPERLY");
    }
  },

  clearCassettes: function() {
    Tapedeck.Sandbox.log("Clearing all cassettes");
    Tapedeck.Sandbox.Cassettes = { };
  },

  pendingCallbacks: { },
  responseHandler: function(response) {
    var callbacks = Tapedeck.Sandbox.pendingCallbacks;
    if (response.callbackID in callbacks) {
      callbacks[response.callbackID](response);
    }
  },

  newResponse: function(message, object) {
    var response = (object ? object : { });
    response.type = "response";

    if ("callbackID" in message) {
      response.callbackID = message.callbackID;
    }
    return response;
  },

  newRequest: function(object, callback) {
    var request = (object ? object : { });
    request.type = "request";

    if (typeof(callback) != "undefined" &&
        callback != null) {
      var cbID = new Date().getTime();
      while (cbID in Tapedeck.Sandbox.pendingCallbacks) {
        cbID = cbID + 1;
      }

      Tapedeck.Sandbox.pendingCallbacks[cbID] = callback;
      request.callbackID = cbID;
    }
    return request;
  },

  // Tapedeck.ajax cannot be performed from the Sandbox, relay to background
  ajax : function(params) {
    Tapedeck.Sandbox.log("Sandbox is calling out for AJAX: " + JSON.stringify(params),
                         Tapedeck.Backend.Utils.DEBUG_LEVELS.ALL);

    var successFn = params.success;
    var errorFn = params.error;
    delete params['success'];
    delete params['error'];

    var handleAjax = function(response) {
      if (typeof(response.error) == "undefined") {
        // success callback
        successFn(response.responseText);
      }
      else {
        // an error happened
        errorFn(response);
      }
    };

    var message = Tapedeck.Sandbox.newRequest({
      action : "ajax",
      params : params
    }, handleAjax);
    // callback to params.success or params.error

    Tapedeck.Sandbox.sendMessage(message);
  },

  sendMessage: function(message) {
    var str = "Sending " + message.type;
    if (typeof(message.action) != "undefined") {
      str += " with action '" + message.action + "'";
    }
    else if (typeof(message.rendered) != "undefined") {
      str += " with a render";
    }
    else {
      str += " ## " + JSON.stringify(message);
    }
    Tapedeck.Sandbox.log(str);
    window.parent.postMessage(message, "*");
  },

  log: function(str, level) {
    Tapedeck.Backend.Utils.log("Sandbox", str, level);
  },
};

window.addEventListener('message', Tapedeck.Sandbox.messageHandler);
Tapedeck.Sandbox.init();