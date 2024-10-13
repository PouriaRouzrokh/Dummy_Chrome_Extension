/******/ (() => { // webpackBootstrap
/*!************************!*\
  !*** ./src/content.js ***!
  \************************/
// Create the bubble element
var bubble = document.createElement('div');
bubble.id = 'text-mod-bubble';
bubble.innerHTML = 'TM';
bubble.style.cssText = "\n  position: fixed;\n  right: 20px;\n  top: 50%;\n  transform: translateY(-50%);\n  width: 50px;\n  height: 50px;\n  border-radius: 50%;\n  background-color: #007bff;\n  color: white;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  font-weight: bold;\n  cursor: pointer;\n  z-index: 9999;\n  box-shadow: 0 2px 5px rgba(0,0,0,0.2);\n";

// Add the bubble to the page
document.body.appendChild(bubble);
console.log('Bubble created and added to the page.');

// Add click event listener to the bubble
bubble.addEventListener('click', function () {
  console.log('Bubble clicked!'); // Log when the bubble is clicked
  chrome.runtime.sendMessage({
    action: 'openSidePanel'
  });
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'toggleBubble') {
    bubble.style.display = request.show ? 'flex' : 'none';
    console.log("Bubble visibility set to: ".concat(request.show)); // Log visibility changes
  }
});
/******/ })()
;
//# sourceMappingURL=content.js.map