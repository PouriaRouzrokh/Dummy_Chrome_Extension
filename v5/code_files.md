## v5/popup.js

```js
document.addEventListener('DOMContentLoaded', function() {
  const curlInput = document.getElementById('curlInput');
  const messageInput = document.getElementById('messageInput');
  const jsonPath = document.getElementById('jsonPath');
  const sendButton = document.getElementById('sendButton');
  const responseArea = document.getElementById('responseArea');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const toggleRaw = document.getElementById('toggleRaw');
  let rawResponse = null;
  let showRaw = false;

  // Load saved settings
  chrome.storage.local.get(['curlCommand', 'jsonPath'], function(result) {
    if (result.curlCommand) curlInput.value = result.curlCommand;
    if (result.jsonPath) jsonPath.value = result.jsonPath;
  });

  toggleRaw.addEventListener('click', function() {
    showRaw = !showRaw;
    if (rawResponse) {
      displayResponse(rawResponse);
    }
  });

  sendButton.addEventListener('click', async function() {
    const curl = curlInput.value;
    const message = messageInput.value;
    const pathExpression = jsonPath.value.trim();

    if (!curl || !message) {
      responseArea.innerHTML = '<span class="text-red-500">Please provide both CURL command and message.</span>';
      return;
    }

    // Save settings
    chrome.storage.local.set({ 
      curlCommand: curl,
      jsonPath: pathExpression
    });

    loadingIndicator.style.display = 'block';
    responseArea.innerHTML = '';

    try {
      chrome.runtime.sendMessage(
        { 
          type: 'makeRequest',
          curlCommand: curl,
          message: message
        },
        function(response) {
          if (response.success) {
            rawResponse = response.data;
            displayResponse(response.data);
          } else {
            responseArea.innerHTML = `<span class="text-red-500">Error: ${response.error}</span>`;
          }
          loadingIndicator.style.display = 'none';
        }
      );
    } catch (error) {
      loadingIndicator.style.display = 'none';
      responseArea.innerHTML = `<span class="text-red-500">Error: ${error.message}</span>`;
    }
  });

  function extractValue(obj, path) {
    if (!path) return obj;
    
    return path.split('.').reduce((current, part) => {
      if (part.includes('[') && part.includes(']')) {
        const arrayPart = part.split('[');
        const arrayName = arrayPart[0];
        const index = parseInt(arrayPart[1].replace(']', ''));
        return current[arrayName][index];
      }
      return current[part];
    }, obj);
  }

  function displayResponse(response) {
    loadingIndicator.style.display = 'none';
    
    if (showRaw) {
      responseArea.innerHTML = `<pre class="text-sm">${JSON.stringify(response, null, 2)}</pre>`;
      return;
    }

    const pathExpression = jsonPath.value.trim();
    
    // If no path is specified or path is empty, show the full response
    if (!pathExpression) {
      responseArea.innerHTML = `<pre class="text-sm">${JSON.stringify(response, null, 2)}</pre>`;
      return;
    }

    try {
      const result = extractValue(response, pathExpression);
      responseArea.innerHTML = `<div class="text-sm">${result}</div>`;
    } catch (error) {
      responseArea.innerHTML = `<span class="text-red-500">Error extracting value: ${error.message}</span>`;
    }
  }
});
```

## v5/background.js

```js
function parseCurl(curlCommand, message) {
    const processedCommand = curlCommand.replace(/\$message\$/g, message);
    
    // Updated regex to handle URLs with or without protocol specification
    const urlMatch = processedCommand.match(/curl\s+(?:(?:https?:)?\/\/)?([^\s]+)/);
    if (!urlMatch) throw new Error('Invalid CURL command: URL not found');
  
    // Extract the URL and ensure it has a protocol
    let url = urlMatch[0].replace('curl ', '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Default to http:// if no protocol is specified
        url = 'http://' + url;
    }
    
    const headerMatches = processedCommand.match(/-H\s+"([^"]+)"/g);
    const dataMatch = processedCommand.match(/-d\s+'([^']+)'/);
  
    const headers = {
        'Content-Type': 'application/json' // Default content type header
    };
    
    if (headerMatches) {
        headerMatches.forEach(header => {
            const [key, value] = header.match(/-H\s+"([^"]+)"/)[1].split(': ');
            headers[key] = value;
        });
    }
  
    let data = null;
    if (dataMatch) {
        try {
            data = JSON.parse(dataMatch[1]);
            // Handle the special case of message replacement in nested JSON
            if (typeof data === 'object') {
                Object.keys(data).forEach(key => {
                    if (typeof data[key] === 'string') {
                        data[key] = data[key].replace(/\$message\$/g, message);
                    }
                });
            }
        } catch (e) {
            data = dataMatch[1].replace(/\$message\$/g, message);
        }
    }
  
    return { url, headers, data };
}
  
async function makeRequest({ url, headers, data }) {
    try {
        // Extract protocol and host from URL for error messaging
        const urlObj = new URL(url);
        const protocol = urlObj.protocol;
        const host = urlObj.host;

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            // Handle non-JSON responses (like text/plain)
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { text };
            }
        }
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'localhost') {
                throw new Error(
                    `Connection failed to localhost. Please ensure:\n` +
                    `1. The server is running at ${url}\n` +
                    `2. The protocol (${urlObj.protocol}) matches your server configuration\n` +
                    `3. The port number is correct`
                );
            } else {
                throw new Error(`Connection failed to ${url}. Please check the URL and try again.`);
            }
        }
        throw error;
    }
}
  
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'makeRequest') {
        const { curlCommand, message } = request;
        
        try {
            const parsedCurl = parseCurl(curlCommand, message);
            makeRequest(parsedCurl)
                .then(response => {
                    sendResponse({ success: true, data: response });
                })
                .catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            
            return true; // Will respond asynchronously
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
});
```

## v5/popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Request Handler</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
  <style>
    body {
      width: 500px;
      min-height: 400px;
      padding: 20px;
    }
    .loading {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.9);
      padding: 20px;
      border-radius: 8px;
    }
    #curlInput {
      height: 150px;
    }
  </style>
</head>
<body class="bg-gray-50">
  <div class="max-w-2xl mx-auto">
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">CURL Command Template</label>
      <textarea id="curlInput" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter your CURL command with $message$ placeholder..."></textarea>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        JSON Path for Output Extraction (Optional)
        <span class="text-gray-500 text-xs ml-1">Leave empty to see full response</span>
      </label>
      <input type="text" id="jsonPath" class="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., choices[0].message.content">
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
      <input type="text" id="messageInput" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter your message...">
    </div>

    <button id="sendButton" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
      Send Request
    </button>

    <div class="mt-4">
      <div class="flex justify-between items-center">
        <label class="block text-sm font-medium text-gray-700">Response</label>
        <button id="toggleRaw" class="text-sm text-blue-600 hover:text-blue-800">
          Toggle Raw/Processed
        </button>
      </div>
      <div id="responseArea" class="w-full h-32 p-2 mt-2 bg-white border border-gray-300 rounded-md overflow-auto"></div>
    </div>

    <div class="loading" id="loadingIndicator">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Processing...</p>
      </div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

