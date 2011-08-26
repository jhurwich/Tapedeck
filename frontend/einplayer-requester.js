if (typeof Einplayer == "undefined") {
  Einplayer = {};
}

Einplayer.Frontend.Requester = {

  getView: function(viewName, options, packageName, callback) {
    var request = {
      action  : "getView",
      viewName: viewName,
      options : options,
    };
    if (packageName && packageName.length > 0) {
      request.packageName = packageName;
    }
    chrome.extension.sendRequest(request, callback);
  },
};
