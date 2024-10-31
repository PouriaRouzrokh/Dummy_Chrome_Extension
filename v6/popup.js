let port = null;

function initializePort() {
  if (port) {
    port.disconnect();
  }
  port = chrome.runtime.connect({ name: 'chat-stream' });
  
  port.onMessage.addListener((msg) => {
    const responseDiv = document.getElementById('response');
    
    if (msg.error) {
      responseDiv.textContent += '\nError: ' + msg.error;
      document.getElementById('sendButton').disabled = false;
    } else if (msg.content) {
      responseDiv.textContent += msg.content;
    } else if (msg.done) {
      document.getElementById('sendButton').disabled = false;
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('Port disconnected');
    port = null;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize port when popup opens
  initializePort();

  const apiKeyInput = document.getElementById('apiKey');
  const userMessageInput = document.getElementById('userMessage');
  const sendButton = document.getElementById('sendButton');
  const responseDiv = document.getElementById('response');

  // Load saved API key
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

  // Save API key when changed
  apiKeyInput.addEventListener('change', () => {
    chrome.storage.local.set({ openaiApiKey: apiKeyInput.value });
  });

  sendButton.addEventListener('click', async () => {
    const message = userMessageInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!message || !apiKey) {
      alert('Please enter both a message and an API key');
      return;
    }

    // Clear previous response and disable button
    responseDiv.textContent = '';
    sendButton.disabled = true;

    try {
      // Ensure port is initialized
      if (!port) {
        initializePort();
      }

      // Send message
      port.postMessage({ 
        message, 
        apiKey 
      });
    } catch (error) {
      console.error('Error sending message:', error);
      responseDiv.textContent = 'Error: ' + error.message;
      sendButton.disabled = false;
    }
  });
});