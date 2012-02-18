var onObject = null;
if (typeof(TapedeckInjected) != "undefined") {
  onObject = TapedeckInjected;
}
else if (typeof(Tapedeck) != "undefined" &&
         typeof(Tapedeck.Backend) != "undefined") {
  onObject = Tapedeck.Backend;
}

if (onObject != null) {
  console.log("Suite attached");
  onObject.ParserSuite = {
    // poi = pattern of interest
    // eoi = element of interest

    Links: {
      suite: null, // will refer to parent object
      poi: "<a(?:[^h]+)?href=(?:\"|\')([^\"|^\']+?.mp3)(?:\"|\')(?:.+?)>",

      parse: function(text) {
        var regex = new RegExp(this.poi, "g");
        var match = null;

        var eoiAndTrackMap = [];
        while ((match = regex.exec(text)) != null) {
          if (match.length > 1) {
            var url = match[1];
            var track = { type : "mp3",
                          url  : url };
            eoiAndTrackMap[url] = [match[0], track];
            
          }
        }

        this.rebuildDOM(text, eoiAndTrackMap);
      },

      rebuildDOM: function(text, eoiAndTrackMap) {
        for (var url in eoiAndTrackMap) {
          var eoi = eoiAndTrackMap[url][0];
          var track = eoiAndTrackMap[url][1];

          var container = this.suite.Util.findParent(text, eoi);
          
        }
      },
    },

    Tumblr: {
      poi: "",
      parse: function(text) {

      },
    },

    AudioElements: {
      poi: "",
      parse: function(text) {

      },
    },

    Soundcloud: {
      poi: "",
      parse: function(text) {

      },
    },

    Util: {
      removeUnwantedTags: function(text) {
        var openTagRegex = function(tag) {
          return new RegExp("<\s*" + tag + "[^<>]*>");
        }

        var closeTagRegex = function(tag) {
          return new RegExp("<\/" + tag + "[^<>]*>", "i");
        }

        var selfClosedTagRegex = function(tag) {
          return new RegExp("<\s*" + tag + "[^<>]*\/>", "i");
        }
        
        var unwantedBlocks = ["head", "meta", "script", "noscript"]; // remove these tags and everything that may be in them
        for (var i = 0; i < unwantedBlocks.length; i++) {
          var tag = unwantedBlocks[i];

          var openPos = -1;
          var closeMatch = null;
          while ((openPos = text.search(openTagRegex(tag))) != -1) {
            if ((closeMatch = text.match(closeTagRegex(tag))) != null) {
              var closeLen = closeMatch[0].length;
              var toRemove = text.substring(openPos, closeMatch.index + closeLen);
              text = text.replace(toRemove, "");
            }
            else {
              console.error("no close tag for open tag '" + tag + "'");
            }
            
          }
        }

        var unwantedTags = ["html", "body", "!DOCTYPE"]; // only remove these tags themselves, not their contents
        for (var i = 0; i < unwantedTags.length; i++) {
          var tag = unwantedTags[i];

          var match = null;
          while ((match = text.match(openTagRegex(tag))) != null) {
              text = text.replace(match[0], "");
          }
          while ((match = text.match(closeTagRegex(tag))) != null) {
              text = text.replace(match[0], "");
          }
          while ((match = text.match(selfClosedTagRegex(tag))) != null) {
              text = text.replace(match[0], "");
          }
        }

        return text;
      },
      
      findParent: function(text, eoi) {
        var containerTags = {"p": { },
                             "div" : { },
                             "body": { },
                             "table": { },
                             "tr": { },
                             "li": { },
                             "object": { },
                             "param": { } };

        var openTagPattern = function(tag) {
          return "<\s*" + tag + "[^<>]*>";
        }

        var closeTagPattern = function(tag) {
          return "<\/" + tag + "[^<>]*>";
        }
        
        var eoiIndex = text.indexOf(eoi);
        
        var postText = text.substring(eoiIndex);
        var preText = text.substring(0, eoiIndex);

        // we reverse preText, brace yourself for some cray cray
        preText = preText.split('').reverse().join('');

        // determine nextOpen and nextClose for each tag
        for (var tagName in containerTags) {
          var tagData = containerTags[tagName];
          var openTagRegex = new RegExp(openTagPattern(tagName));
          var closeTagRegex = new RegExp(closeTagPattern(tagName));

          // these are relative to the eoi
          tagData.nextOpen = postText.search(openTagRegex);
          tagData.nextClose = postText.search(closeTagRegex);

          // If nextOpen < nextClose than the tag has a pair and won't
          // be the close tag we are looking for.
          // If a nextClose can't be found, then this isn't the
          // container we're looking for
          while (tagData.nextClose != -1 &&
                 tagData.nextOpen < tagData.nextClose) {

            var afterOpenText = postText.substring(tagData.nextOpen);
            var openTagLength = afterOpenText.match(openTagRegex)[0].length;
            afterOpenText = afterOpenText.substring(openTagLength);
            
            var afterCloseText = postText.substring(tagData.nextClose);
            var closeTagLength = afterCloseText.match(closeTagRegex)[0].length;
            afterCloseText = afterCloseText.substring(closeTagLength);

            tagData.nextOpen = afterOpenText.search(openTagRegex) +
                               tagData.nextOpen +
                               openTagLength;
            tagData.nextClose = afterCloseText.search(closeTagRegex) +
                                tagData.nextClose +
                                closeTagLength;
          }
        }

        // find out which close tag is first, make sure it's before it's open
        var firstClose = text.length;
        for (var tagName in containerTags) {
          var tagData = containerTags[tagName];
          if (tagData.nextClose < firstClose) {

          }
        }
        console.log(JSON.stringify(containerTags));
      },
    },
  };
}
else {
  console.error("Oh noes, nothing to add the parser object onto");
}

for (var parseType in onObject.ParserSuite) {
  onObject.ParserSuite[parseType].suite = onObject.ParserSuite;
}