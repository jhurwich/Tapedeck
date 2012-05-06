TapedeckBA = {
  blockList: null,
  onload: function() {
    var blockButton = document.getElementById("block-button");
    blockButton.addEventListener('click', TapedeckBA.blockCurrent);
    var blockInput = document.getElementById("block-input");
    blockInput.addEventListener('keydown', function(event) {
      if (event.keyCode == 13) TapedeckBA.addBlockInput();
    });
    TapedeckBA.loadBlockList();
  },

  loadBlockList: function() {
    chrome.tabs.getSelected(undefined, function(tab) {
      var request = {
        action: "getBlockList",
      }
      chrome.extension.sendRequest(request, function(response) {
        var oldListDOM = document.getElementById("blocklist");
        var newListDOM = document.createElement("div");
        newListDOM.id = oldListDOM.id;

        TapedeckBA.blockList = JSON.parse(response.blockList);
        for (var i = 0; i < TapedeckBA.blockList.length; i++) {
          var blockURL = TapedeckBA.blockList[i];
          var blockRow = TapedeckBA.makeBlockRow(i, blockURL);

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
    row.index = index
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
      remove.onclick = TapedeckBA.blockRowRemove;
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
      TapedeckBA.addToBlockList(tab.url);
    });
  },

  addBlockInput: function() {
    var input = document.getElementById("block-input");
    var newPattern = input.value;
    input.value = "";
    TapedeckBA.addToBlockList(newPattern);
  },

  addToBlockList: function(str) {
    TapedeckBA.blockList.push(str);

    TapedeckBA.sendBlockListToSave(TapedeckBA.blockList, function() {
      TapedeckBA.loadBlockList();
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

    TapedeckBA.blockList.splice(target.index, 1)
    TapedeckBA.sendBlockListToSave(TapedeckBA.blockList, function() {
      TapedeckBA.loadBlockList();
    });
  },

  sendBlockListToSave: function(blockList, callback) {
    var request = {
      action: "saveBlockList",
      blockList: JSON.stringify(blockList)
    }
    chrome.extension.sendRequest(request, function(response) {
      callback(response);
    });
  },
};

window.onload = TapedeckBA.onload;
