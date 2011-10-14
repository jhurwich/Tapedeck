describe("PlaylistList View", function() {

  it ("should have rows for each playlist when rendered", function() {
    var playlist = new this.Einplayer
                           .Backend
                           .Collections
                           .Playlist(this.testTracks);
    
    var viewScript = this.Einplayer
                         .Backend
                         .TemplateManager
                         .getViewScript("PlaylistList");

    var playlistList = new this.Einplayer
                               .Backend
                               .Collections
                               .PlaylistList([playlist]);

    var view = new viewScript({ playlistList: playlistList });
    var listDOM = view.render();
    
    var rows  = $(listDOM).find(".row");
    expect(rows.length).toEqual(1);

    playlistList = new this.Einplayer
                           .Backend
                           .Collections
                           .PlaylistList([playlist, playlist]);

    view = new viewScript({ playlistList: playlistList });
    listDOM = view.render();
    
    var rows  = $(listDOM).find(".row");
    expect(rows.length).toEqual(2);
  });
});
