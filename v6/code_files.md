## v6/popup.js

```js
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
```

## v6/background.js

```js
// Listen for connections
chrome.runtime.onConnect.addListener(function(port) {
    console.log("Connection established", port.name);
    
    if (port.name !== "chat-stream") return;
  
    // Listen for messages on this port
    port.onMessage.addListener(async function(msg) {
      console.log("Received message in background", msg);
      
      if (!msg.message || !msg.apiKey) {
        port.postMessage({ error: "Missing message or API key" });
        return;
      }
  
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${msg.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant.'
              },
              {
                role: 'user',
                content: msg.message
              }
            ],
            stream: true
          })
        });
  
        if (!response.ok) {
          const error = await response.text();
          port.postMessage({ error: `API Error: ${error}` });
          return;
        }
  
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
  
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              port.postMessage({ done: true });
              break;
            }
  
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
  
            for (const line of lines) {
              if (line.includes('[DONE]')) continue;
              
              try {
                const cleanLine = line.replace(/^data: /, '');
                if (cleanLine === '[DONE]') continue;
                
                const parsed = JSON.parse(cleanLine);
                if (parsed.choices[0].delta.content) {
                  port.postMessage({ content: parsed.choices[0].delta.content });
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          port.postMessage({ error: `Stream error: ${error.message}` });
        }
      } catch (error) {
        console.error('Fetch error:', error);
        port.postMessage({ error: `Fetch error: ${error.message}` });
      }
    });
  
    // Handle disconnect
    port.onDisconnect.addListener(function() {
      console.log("Port disconnected");
    });
  });
  
  // Log that background script is loaded
  console.log("Background script loaded");
```

## v6/popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>OpenAI Chat Streamer</title>
  <style>
    body {
      width: 350px;
      padding: 10px;
      font-family: Arial, sans-serif;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    textarea {
      width: 100%;
      height: 100px;
      resize: vertical;
    }
    .response {
      white-space: pre-wrap;
      border: 1px solid #ccc;
      padding: 10px;
      margin-top: 10px;
      max-height: 200px;
      overflow-y: auto;
    }
    #apiKey {
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <label for="apiKey">OpenAI API Key:</label>
      <input type="password" id="apiKey" placeholder="Enter your API key">
    </div>
    <textarea id="userMessage" placeholder="Enter your message..."></textarea>
    <button id="sendButton">Send Message</button>
    <div id="response" class="response"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

