Sandbox = {
  messageHandler: function(e) {
    var message = e.data;
    switch(message.action)
    {

      case "render":
        var response = Sandbox.newResponse(message);
        response.el = Sandbox.render(message.textTemplate, message.params)

        window.parent.postMessage(response, "*");
        break;
      default:
        throw new Error("Sandbox was sent an unknown action");
        break;
    }
  },

  render: function(textTemplate, params) {
    var template = _.template(textTemplate);
    return template({ params: params });
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

window.addEventListener('message', Sandbox.messageHandler);
