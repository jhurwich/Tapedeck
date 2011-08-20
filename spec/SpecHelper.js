beforeEach(function() {
  this.addMatchers({
    
    // A track model must reflect the JSON from which it was created in 
    // order to be considered valid.
    toReflectJSON: function(expectedJSON) {
      
      for (var attrName in expectedJSON) {
        if (expectedJSON[attrName] != this.actual.get(attrName)) {
          return false;
        }
      }
      return true;
    }
  })
});
