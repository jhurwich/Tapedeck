Einplayer.Backend.RequestHandler = {

  handleRequest: function(request, sender, sendResponse) {
    switch(request.action)
    {
      case "getView":
        var scriptName = request.viewName;
        var packageName = (request.packageName ? request.packageName : null);
        
        
        var rendered = Einplayer.Backend.TemplateManager.renderView
                                (scriptName, request.options, packageName);

        sendResponse({ view: $(rendered).html() });
        break;
      default:
        throw new Error("handleRequest was sent an unknown action");
    }
  },
};
