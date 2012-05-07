Tapedeck.Backend.Views.TapedeckView = Backbone.View.extend({

  textTemplate: null,
  template: null,
  initialize: function() {

    // the template name is the id, each word separated by dashes capitalized and concated
    var templateName = Tapedeck.Backend.Utils.idToTemplateName(this.id);

    this.textTemplate = Tapedeck.Backend.TemplateManager.getTemplate(templateName)
    this.template = _.template(this.textTemplate);

    if (typeof(this.init) != "undefined") {
      this.init();
    }
  },

  getEvents: function() {
    var events = {};

    var eventText = Tapedeck.Backend.Utils.getTagBodies(this.textTemplate, "events")[0];
    var eventRegex = /"([^"]+)["]\s*?:\s*?["]([^"]+)["]/g;

    var eventMatch = null;
    while ((eventMatch = eventRegex.exec(eventText)) != null) {
      var cmdAndSelector = eventMatch[1];
      var fnName = eventMatch[2];
      events[cmdAndSelector] = fnName;
    }

    // we've got the events for this view, but we still need the sub-views'
    for (var i = 0; i < this.requiredTemplates.length; i++ ) {
      var templateName = this.requiredTemplates[i];
      if (templateName != Tapedeck.Backend.Utils.idToTemplateName(this.id)) {
        var subTemplate = Tapedeck.Backend.TemplateManager.getViewScript(templateName);
        if (typeof(subTemplate.prototype.getEvents) != "undefined") {
          // instantiate the view to pull the events
          var subEvents = (new subTemplate({})).getEvents();
          events = _.extend(events, subEvents);
        }
        else {
          console.trace();
          var subEvents = subTemplate.prototype.proxyEvents;
          events = _.extend(events, subEvents)
        }
      }
    }
    return events;
  },

});
