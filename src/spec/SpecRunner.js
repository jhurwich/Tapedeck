jasmine.getEnv().addReporter(new jasmine.TrivialReporter());
jasmine.getEnv().execute();

var statusDiv = document.createElement("div");
statusDiv.className = "status banner";
if (__Jasmine__RUN_ALL_TESTS) {
  var skipped = document.createTextNode("Skipped: " + JSON.stringify(__Jasmine__TESTS_TO_SKIP));
  statusDiv.appendChild(skipped);
}
else {
  var skipped = document.createTextNode("Running: " + JSON.stringify(__Jasmine__TESTS_TO_RUN));
  statusDiv.appendChild(skipped);
}

if(document.body.firstChild) {
  document.body.insertBefore(statusDiv, document.body.firstChild);
}
else {
  document.body.appendChild(statusDiv);
}