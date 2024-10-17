// Create the bubble element
const bubble = document.createElement('div');
bubble.id = 'text-mod-bubble';
bubble.innerHTML = 'TM';
bubble.style.cssText = `
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #007bff;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  cursor: pointer;
  z-index: 9999;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

// Add the bubble to the page
document.body.appendChild(bubble);
console.log('Bubble created and added to the page.');

// Add click event listener to the bubble
bubble.addEventListener('click', () => {
  console.log('Bubble clicked!'); // Log when the bubble is clicked
  chrome.runtime.sendMessage({ action: 'openSidePanel' });
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleBubble') {
    bubble.style.display = request.show ? 'flex' : 'none';
    console.log(`Bubble visibility set to: ${request.show}`); // Log visibility changes
  }
});