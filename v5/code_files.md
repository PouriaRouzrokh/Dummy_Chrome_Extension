## v5/popup.js

```js
document.addEventListener('DOMContentLoaded', function() {
  const curlInput = document.getElementById('curlInput');
  const messageInput = document.getElementById('messageInput');
  const outputPath = document.getElementById('outputPath');
  const sendButton = document.getElementById('sendButton');
  const responseArea = document.getElementById('responseArea');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const toggleRaw = document.getElementById('toggleRaw');
  const streamingToggle = document.getElementById('streamingToggle');
  let rawResponse = '';
  let showRaw = false;
  let port = null;

  // Function to update placeholder based on streaming toggle
  function updatePlaceholder() {
    if (streamingToggle.checked) {
      outputPath.placeholder = 'e.g., choices[0].delta.content';
    } else {
      outputPath.placeholder = 'e.g., choices[0].message.content';
    }
  }

  // Update placeholder when streaming toggle changes
  streamingToggle.addEventListener('change', updatePlaceholder);

  // Set initial placeholder
  updatePlaceholder();

  function initializePort() {
    if (!port) {
      port = chrome.runtime.connect({ name: 'streaming-port' });
      
      port.onMessage.addListener((msg) => {
        if (msg.error) {
          responseArea.innerHTML = `<span class="text-red-500">Error: ${msg.error}</span>`;
          sendButton.disabled = false;
          loadingIndicator.style.display = 'none';
        } else if (msg.content) {
          if (showRaw) {
            rawResponse += JSON.stringify(msg.content) + '\n';
            responseArea.innerHTML = `<pre class="text-sm">${rawResponse}</pre>`;
          } else {
            try {
              const pathExp = outputPath.value.trim();
              if (pathExp) {
                const extractedContent = extractValue(msg.content, pathExp);
                if (extractedContent !== undefined && extractedContent !== null) {
                  responseArea.innerHTML += extractedContent;
                }
              } else {
                responseArea.innerHTML += JSON.stringify(msg.content) + '\n';
              }
            } catch (error) {
              console.error('Error processing stream chunk:', error);
              console.error('Content:', msg.content);
              console.error('Path:', outputPath.value.trim());
            }
          }
        } else if (msg.done) {
          sendButton.disabled = false;
          loadingIndicator.style.display = 'none';
        }
      });

      port.onDisconnect.addListener(() => {
        console.log('Port disconnected');
        port = null;
      });
    }
    return port;
  }

  // Load saved settings
  chrome.storage.local.get(['curlCommand', 'outputPath'], function(result) {
    if (result.curlCommand) curlInput.value = result.curlCommand;
    if (result.outputPath) outputPath.value = result.outputPath;
  });

  toggleRaw.addEventListener('click', function() {
    showRaw = !showRaw;
    if (showRaw) {
      responseArea.innerHTML = `<pre class="text-sm">${rawResponse}</pre>`;
    } else {
      // Re-process the entire response
      responseArea.innerHTML = '';
      if (streamingToggle.checked) {
        const chunks = rawResponse.split('\n').filter(chunk => chunk);
        chunks.forEach(chunk => {
          try {
            const content = JSON.parse(chunk);
            const pathExp = outputPath.value.trim();
            if (pathExp) {
              const extractedContent = extractValue(content, pathExp);
              if (extractedContent !== undefined && extractedContent !== null) {
                responseArea.innerHTML += extractedContent;
              }
            } else {
              responseArea.innerHTML += JSON.stringify(content) + '\n';
            }
          } catch (error) {
            console.error('Error reprocessing chunk:', error);
          }
        });
      } else {
        try {
          const pathExp = outputPath.value.trim();
          const content = JSON.parse(rawResponse);
          if (pathExp) {
            const extractedContent = extractValue(content, pathExp);
            responseArea.innerHTML = `<div class="text-sm">${extractedContent}</div>`;
          } else {
            responseArea.innerHTML = `<pre class="text-sm">${JSON.stringify(content, null, 2)}</pre>`;
          }
        } catch (error) {
          responseArea.innerHTML = `<div class="text-sm">${rawResponse}</div>`;
        }
      }
    }
  });

  sendButton.addEventListener('click', async function() {
    const curl = curlInput.value;
    const message = messageInput.value;
    const isStreaming = streamingToggle.checked;

    if (!curl || !message) {
      responseArea.innerHTML = '<span class="text-red-500">Please provide both CURL command and message.</span>';
      return;
    }

    // Save settings
    chrome.storage.local.set({ 
      curlCommand: curl,
      outputPath: outputPath.value
    });

    // Reset response area and raw response
    rawResponse = '';
    responseArea.innerHTML = '';
    loadingIndicator.style.display = 'block';
    sendButton.disabled = true;

    if (isStreaming) {
      try {
        const currentPort = initializePort();
        if (!currentPort) {
          throw new Error('Failed to initialize port');
        }

        currentPort.postMessage({ 
          type: 'makeStreamingRequest',
          curlCommand: curl,
          message: message
        });
      } catch (error) {
        loadingIndicator.style.display = 'none';
        sendButton.disabled = false;
        responseArea.innerHTML = `<span class="text-red-500">Error: ${error.message}</span>`;
      }
    } else {
      // Non-streaming request
      try {
        chrome.runtime.sendMessage(
          { 
            type: 'makeRequest',
            curlCommand: curl,
            message: message
          },
          function(response) {
            if (response.success) {
              rawResponse = JSON.stringify(response.data);
              displayResponse(response.data);
            } else {
              responseArea.innerHTML = `<span class="text-red-500">Error: ${response.error}</span>`;
            }
            loadingIndicator.style.display = 'none';
            sendButton.disabled = false;
          }
        );
      } catch (error) {
        loadingIndicator.style.display = 'none';
        sendButton.disabled = false;
        responseArea.innerHTML = `<span class="text-red-500">Error: ${error.message}</span>`;
      }
    }
  });

  function displayResponse(response) {
    loadingIndicator.style.display = 'none';
    
    if (showRaw) {
      responseArea.innerHTML = `<pre class="text-sm">${JSON.stringify(response, null, 2)}</pre>`;
      return;
    }

    const pathExpression = outputPath.value.trim();
    
    if (!pathExpression) {
      responseArea.innerHTML = `<pre class="text-sm">${JSON.stringify(response, null, 2)}</pre>`;
      return;
    }

    try {
      const result = extractValue(response, pathExpression);
      if (result !== undefined && result !== null) {
        responseArea.innerHTML = `<div class="text-sm">${result}</div>`;
      } else {
        responseArea.innerHTML = `<span class="text-red-500">No value found at the specified path</span>`;
      }
    } catch (error) {
      responseArea.innerHTML = `<span class="text-red-500">Error extracting value: ${error.message}</span>`;
    }
  }

  function extractValue(obj, path) {
    if (!path) return obj;
    
    try {
      return path.split('.').reduce((current, part) => {
        if (!current) return undefined;
        
        if (part.includes('[') && part.includes(']')) {
          const arrayPart = part.split('[');
          const arrayName = arrayPart[0];
          const index = parseInt(arrayPart[1].replace(']', ''));
          return current[arrayName] ? current[arrayName][index] : undefined;
        }
        return current[part];
      }, obj);
    } catch (error) {
      console.error('Error in extractValue:', error);
      return undefined;
    }
  }
});
```

## v5/background.js

```js
function parseCurl(curlCommand, message) {
    const processedCommand = curlCommand.replace(/\$message\$/g, message);
    
    const urlMatch = processedCommand.match(/curl\s+(?:(?:https?:)?\/\/)?([^\s]+)/);
    if (!urlMatch) throw new Error('Invalid CURL command: URL not found');
  
    let url = urlMatch[0].replace('curl ', '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
    }
    
    const headerRegexes = [
        /(?:-H|--header)\s+"([^"]+)"/g,
        /(?:-H|--header)\s+'([^']+)'/g
    ];
    
    const dataPatterns = [
        /(?:-d|--data|--data-raw)\s+'([^']+)'/,
        /(?:-d|--data|--data-raw)\s+"([^"]+)"/
    ];

    const headers = {
        'Content-Type': 'application/json'
    };
    
    headerRegexes.forEach(regex => {
        let match;
        while ((match = regex.exec(processedCommand)) !== null) {
            const headerContent = match[1];
            const separatorIndex = headerContent.indexOf(':');
            if (separatorIndex !== -1) {
                const key = headerContent.slice(0, separatorIndex).trim();
                const value = headerContent.slice(separatorIndex + 1).trim();
                headers[key] = value;
            }
        }
    });
  
    let data = null;
    for (const pattern of dataPatterns) {
        const match = processedCommand.match(pattern);
        if (match) {
            try {
                data = JSON.parse(match[1]);
                if (typeof data === 'object') {
                    Object.keys(data).forEach(key => {
                        if (typeof data[key] === 'string') {
                            data[key] = data[key].replace(/\$message\$/g, message);
                        }
                    });
                }
            } catch (e) {
                data = match[1].replace(/\$message\$/g, message);
            }
            break;
        }
    }
  
    return { url, headers, data };
}

async function makeRequest({ url, headers, data }) {
    try {
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

async function handleStreamingRequest(port, parsedCurl) {
    try {
        const response = await fetch(parsedCurl.url, {
            method: 'POST',
            headers: parsedCurl.headers,
            body: JSON.stringify(parsedCurl.data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
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
                    try {
                        const cleanLine = line.replace(/^data: /, '');
                        if (cleanLine === '[DONE]') continue;
                        
                        const parsed = JSON.parse(cleanLine);
                        port.postMessage({ content: parsed });
                    } catch (e) {
                        // If the line isn't JSON, send it as raw content
                        if (line.trim()) {
                            port.postMessage({ content: { text: line.trim() } });
                        }
                    }
                }
            }
        } catch (error) {
            port.postMessage({ error: `Stream error: ${error.message}` });
        }
    } catch (error) {
        port.postMessage({ error: `Fetch error: ${error.message}` });
    }
}

// Handle regular message requests
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

// Handle streaming connections
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== "streaming-port") return;

    port.onMessage.addListener(async function(request) {
        if (request.type === 'makeStreamingRequest') {
            try {
                const parsedCurl = parseCurl(request.curlCommand, request.message);
                await handleStreamingRequest(port, parsedCurl);
            } catch (error) {
                port.postMessage({ error: error.message });
            }
        }
    });
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
    .help-text {
      display: block;
      font-size: 0.75rem;
      color: #6B7280;
      margin-top: 0.25rem;
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
      <label class="flex items-center space-x-2">
        <input type="checkbox" id="streamingToggle" class="form-checkbox">
        <span class="text-sm font-medium text-gray-700">Enable Streaming</span>
      </label>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700">
        Output Path for Response JSON Processing
      </label>
      <span class="help-text">Leave empty to see full response</span>
      <input type="text" id="outputPath" class="w-full p-2 border border-gray-300 rounded-md mt-1" placeholder="e.g., choices[0].message.content">
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

