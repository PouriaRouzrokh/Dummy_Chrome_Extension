/******/ (() => { // webpackBootstrap
/*!**************************!*\
  !*** ./src/sidepanel.js ***!
  \**************************/
document.addEventListener('DOMContentLoaded', function () {
  var textArea = document.getElementById('modifiedTextArea');
  var renameButton = document.getElementById('renameButton');

  // Get the modified text from storage when the side panel is opened
  chrome.storage.local.get('modifiedText', function (data) {
    if (data.modifiedText) {
      console.log("Retrieved modified text from storage:", data.modifiedText);
      textArea.value = data.modifiedText;
    } else {
      textArea.value = "No text available. Select text on the page and use the context menu to modify it.";
    }
  });

  // Rename button click event
  renameButton.addEventListener('click', function () {
    var uppercaseText = document.getElementById('uppercaseText').value;
    var capitalizeText = document.getElementById('capitalizeText').value;
    var reverseText = document.getElementById('reverseText').value;

    // Send the new names to the background script
    chrome.runtime.sendMessage({
      type: 'renameMacros',
      uppercaseText: uppercaseText,
      capitalizeText: capitalizeText,
      reverseText: reverseText
    }, function (response) {
      if (response.status === 'success') {
        console.log('Macros renamed successfully');
      }
    });
  });
});
/******/ })()
;
//# sourceMappingURL=sidepanel.js.map