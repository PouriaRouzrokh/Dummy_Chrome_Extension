/******/ (() => { // webpackBootstrap
/*!**********************!*\
  !*** ./src/popup.js ***!
  \**********************/
document.addEventListener('DOMContentLoaded', function () {
  var textArea = document.getElementById('uppercasedTextArea');
  var renameButton = document.getElementById('renameButton');

  // Get the modified text from storage when the popup is opened
  chrome.storage.local.get('modifiedText', function (data) {
    if (data.modifiedText) {
      console.log("Retrieved modified text from storage:", data.modifiedText);
      textArea.value = data.modifiedText;
    } else {
      textArea.value = "No text available";
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
//# sourceMappingURL=popup.js.map