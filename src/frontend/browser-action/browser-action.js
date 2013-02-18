if (typeof Tapedeck == "undefined") {
  var Tapedeck = { };
}

Tapedeck.BA = {
  blockList: null,
  onload: function() {
    // we've established Tapedeck.Frontend for Utils, swing that onto BA
    var utils = Tapedeck.Frontend.Utils;
    Tapedeck.Frontend = Tapedeck.BA;
    Tapedeck.BA.Utils = utils;

    var blockButton = document.getElementById("block-button");
    blockButton.addEventListener('click', Tapedeck.BA.blockCurrent);
    var blockInput = document.getElementById("block-input");
    blockInput.addEventListener('keydown', function(event) {
      if (event.keyCode == 13) Tapedeck.BA.addBlockInput();
    });
    Tapedeck.BA.loadVoices();
    Tapedeck.BA.loadPackages();
    Tapedeck.BA.loadBlockList();
  },

  loadVoices: function() {
    var request = Tapedeck.BA.Utils.newRequest({
      action: "getVoices"
    });
    chrome.extension.sendRequest(request, function(response) {
      var speechDOM = document.getElementById('speech-select');
      var voiceArray = response.voices;
      var hasENUS = false;
      if (voiceArray.length === 0) {
        var opt = document.createElement('option');
        opt.setAttribute('value', "getNewVoices");
        opt.innerText = "No voices, click here to get some.";
        speechDOM.appendChild(opt);
      }
      else {
        for (var i = 0; i < voiceArray.length; i++) {
          var opt = document.createElement('option');
          var name = voiceArray[i].voiceName;
          if (name == "US English Female TTS (by Google)") {
            hasENUS = true;
          }
          if (name == response.currentVoice) {
            opt.setAttribute('selected', '');
          }
          opt.setAttribute('value', name);
          opt.innerText = voiceArray[i].voiceName;
          speechDOM.appendChild(opt);
        }

        if (response.currentVoice == "off") {
          var opt = document.createElement('option');
          var name = "off";
          opt.setAttribute('selected', '');
          opt.setAttribute('value', name);
          opt.innerText = "Select a voice to activate speech";
          speechDOM.appendChild(opt);
        }
        else {
          var opt = document.createElement('option');
          var name = "off";
          opt.setAttribute('value', name);
          opt.innerText = "Turn off reading";
          speechDOM.appendChild(opt);
        }
      }

      // and add an entry to get new voices as the last
      if (!hasENUS) {
        var opt = document.createElement('option');
        opt.setAttribute('value', "getNewVoices");
        opt.innerText = "Download US-English voice";
        speechDOM.appendChild(opt);
      }
      speechDOM.addEventListener('change', Tapedeck.BA.setSpeech, false);
    });
  },
  setSpeech: function() {
    var speechDOM = document.getElementById('speech-select');
    var newVoice = speechDOM.options[speechDOM.selectedIndex].getAttribute("value");
    if (newVoice == "getNewVoices") {
      chrome.tabs.create({ url: "https://chrome.google.com/webstore/detail/us-english-female-text-to/pkidpnnapnfgjhfhkpmjpbckkbaodldb?hl=en" });
      return;
    }

    var request = Tapedeck.BA.Utils.newRequest({
      action: "setSpeech",
      voice: newVoice
    });
    chrome.extension.sendRequest(request);
  },

  loadPackages: function() {
    chrome.tabs.getSelected(undefined, function(tab) {
      var request = Tapedeck.BA.Utils.newRequest({
        action: "getPackages"
      });
      chrome.extension.sendRequest(request, function(response) {
        var packages = response.packages;
        var selectDOM = document.getElementById("package-select");

        for (var i = 0; i < packages.length; i++) {
          var newOptionDOM = document.createElement("option");
          newOptionDOM.setAttribute("value", packages[i]);
          newOptionDOM.id = packages[i];
          newOptionDOM.textContent = packages[i];
          if (packages[i] == response.currentPackage) {
            newOptionDOM.setAttribute("selected", "true");
          }

          selectDOM.appendChild(newOptionDOM);
        }

        selectDOM.addEventListener("change", Tapedeck.BA.updatePackage);
      });
    });
  },

  updatePackage: function(event) {
    var selectDOM = document.getElementById("package-select");
    var newPackageName = selectDOM.options[selectDOM.selectedIndex]
                                          .getAttribute("value");
    var request = Tapedeck.BA.Utils.newRequest({
      action: "setPackage",
      name: newPackageName
    });
    chrome.extension.sendRequest(request);
  },

  loadBlockList: function() {
    chrome.tabs.getSelected(undefined, function(tab) {
      var request = Tapedeck.BA.Utils.newRequest({
        action: "getBlockList"
      });
      chrome.extension.sendRequest(request, function(response) {
        var oldListDOM = document.getElementById("blocklist");
        var newListDOM = document.createElement("div");
        newListDOM.id = oldListDOM.id;

        Tapedeck.BA.blockList = JSON.parse(response.blockList);
        for (var i = 0; i < Tapedeck.BA.blockList.length; i++) {
          var blockURL = Tapedeck.BA.blockList[i];
          var blockRow = Tapedeck.BA.makeBlockRow(i, blockURL);

          if (tab.url.match(blockURL) != null) {
            blockRow.className += " active";
          }
          newListDOM.appendChild(blockRow);
        }
        oldListDOM.parentNode.replaceChild(newListDOM, oldListDOM);
      });
    });
  },

  makeBlockRow: function(index, url) {
    var row = document.createElement('div');
    row.index = index;
    row.className = 'blocklist-row';

    var entry = document.createElement('div');
    entry.className = 'blocklist-entry';
    entry.innerHTML = url;
    entry.title = url;
    row.appendChild(entry);

    var buttons = document.createElement('div');
    buttons.className = 'row-buttons';

    if (url.match(/chrome.*\/\//) == null) {
      var remove = document.createElement('div');
      remove.className = "button remove";
      remove.onclick = Tapedeck.BA.blockRowRemove;
      remove.style.backgroundImage = "url('" +
             chrome.extension.getURL("images/rowbutton-remove.png") +
                                     "')";
      buttons.appendChild(remove);
    }

    row.appendChild(buttons);

    return row;
  },

  blockCurrent: function() {
    chrome.tabs.getSelected(undefined, function(tab) {
      Tapedeck.BA.addToBlockList(tab.url);
    });
  },

  addBlockInput: function() {
    var input = document.getElementById("block-input");
    var newPattern = input.value;
    input.value = "";
    Tapedeck.BA.addToBlockList(newPattern);
  },

  addToBlockList: function(str) {
    Tapedeck.BA.blockList.push(str);

    Tapedeck.BA.sendBlockListToSave(Tapedeck.BA.blockList, function() {
      Tapedeck.BA.loadBlockList();
    });
  },

  blockRowRemove: function(e) {
    var target = e.target;
    while(target.className.match(/blocklist-row/) == null) {
      target = target.parentNode;
      if (target == null || !target) {
        return;
      }
    }

    Tapedeck.BA.blockList.splice(target.index, 1);
    Tapedeck.BA.sendBlockListToSave(Tapedeck.BA.blockList, function() {
      Tapedeck.BA.loadBlockList();
    });
  },

  sendBlockListToSave: function(blockList, callback) {
    var request = Tapedeck.BA.Utils.newRequest({
      action: "saveBlockList",
      blockList: JSON.stringify(blockList)
    });
    chrome.extension.sendRequest(request, function(response) {
      callback(response);
    });
  }
};

window.onload = Tapedeck.BA.onload;
