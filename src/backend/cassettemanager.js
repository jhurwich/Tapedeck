Tapedeck.Backend.CassetteManager = {

  cassettes: [],
  currentCassette: null,
  
  init: function() {
    this.cassettes = [];
    for (var CassetteModel in Tapedeck.Backend.Cassettes) {
      var cassette = new Tapedeck.Backend.Cassettes[CassetteModel]();
      this.cassettes.push(cassette);
      this.setCassette(cassette.cid);
    }
  },

  setCassette: function(cid) {
    for (var i = 0; i < this.cassettes.length; i++) {
      var cassette = this.cassettes[i];
      if (cassette.cid = cid) {
        this.currentCassette = cassette;
        break;
      }
    }
  },

  
};
