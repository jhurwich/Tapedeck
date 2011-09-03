Einplayer.Backend.MessageHandler = {

  ports: {},
  init: function() {
    var self = this;
    chrome.extension.onConnect.addListener(function(port) {
      // port.name is a tabId
      self.ports[port.name] = port;

      port.onMessage.addListener(self.handleMessage.curry(port));
    });
  },

  handleMessage: function(port, request) {
    var response = { };
    if ("callbackID" in request) {
      response.callbackID = request.callbackID;
    }
    switch(request.action)
    {
      case "getView":
        var scriptName = request.viewName;
        var packageName = (request.packageName ? request.packageName : null);
        
        
        var rendered = Einplayer.Backend.TemplateManager.renderView
                                (scriptName, request.options, packageName);

        var viewString = $('<div>').append($(rendered))
                                   .remove()
                                   .html();
        response.view = viewString;
        port.postMessage(response);
        break;
      default:
        throw new Error("handleRequest was sent an unknown action");
    }
  },
  

  handleRequest: function(request, sender, sendResponse) {

  },
};
