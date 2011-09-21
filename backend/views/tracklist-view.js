Einplayer.Backend.Views.TrackList = Backbone.View.extend({

  tagName: "div",
  className: "tracklist",
  requiredTemplates: [
    "TrackList"
  ],
  template: null,
  
  initialize: function() {
    this.trackList = this.options.trackList;
    this.rowDblClick = this.options.rowDblClick;
    this.template = _.template(Einplayer.Backend
                                        .TemplateManager
                                        .getTemplate("TrackList"));
  },

  render: function() {
    this.el.innerHTML =  this.template({ trackList: this.trackList.toJSON() });
    $(this.el).attr("rowDblClick", this.rowDblClick);
    return this.el;
  },
});

