## v7/popup.js

```js
document.addEventListener('DOMContentLoaded', function() {
    const curlInput = document.getElementById('curlInput');
    const schemaInput = document.getElementById('schemaInput');
    const outputPath = document.getElementById('outputPath');
    const sendButton = document.getElementById('sendButton');
    const responseArea = document.getElementById('responseArea');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const toggleRaw = document.getElementById('toggleRaw');
    const streamingToggle = document.getElementById('streamingToggle');
    const dynamicForm = document.getElementById('dynamicForm');
    const schemaError = document.getElementById('schemaError');
    
    let rawResponse = '';
    let showRaw = false;
    let port = null;
    let currentSchema = null;
  
    // Load saved settings
    chrome.storage.local.get(['curlCommand', 'outputPath', 'jsonSchema'], function(result) {
      if (result.curlCommand) curlInput.value = result.curlCommand;
      if (result.outputPath) outputPath.value = result.outputPath;
      if (result.jsonSchema) {
        schemaInput.value = result.jsonSchema;
        try {
          generateFormFromSchema(JSON.parse(result.jsonSchema));
        } catch (e) {
          console.error('Failed to load saved schema:', e);
        }
      }
    });
  
    // Update placeholder based on streaming toggle
    function updatePlaceholder() {
      if (streamingToggle.checked) {
        outputPath.placeholder = 'e.g., choices[0].delta.content';
      } else {
        outputPath.placeholder = 'e.g., choices[0].message.content';
      }
    }
  
    streamingToggle.addEventListener('change', updatePlaceholder);
    updatePlaceholder();
  
    // Schema input handler with debouncing
    schemaInput.addEventListener('input', debounce(function() {
      try {
        const schema = JSON.parse(this.value);
        schemaError.classList.add('hidden');
        generateFormFromSchema(schema);
        currentSchema = schema;
        
        // Save schema
        chrome.storage.local.set({ jsonSchema: this.value });
      } catch (e) {
        schemaError.textContent = 'Invalid JSON schema: ' + e.message;
        schemaError.classList.remove('hidden');
        dynamicForm.innerHTML = '<div class="text-gray-500 text-sm text-center p-4">Enter a valid JSON schema to generate the form</div>';
        currentSchema = null;
      }
    }, 500));
  
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  
    function generateFormFromSchema(schema, parentKey = '', level = 0) {
      if (level === 0) {
        dynamicForm.innerHTML = '';
      }
  
      Object.entries(schema).forEach(([key, value]) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        
        if (Array.isArray(value)) {
          // Handle array type schemas
          const arrayContainer = document.createElement('div');
          arrayContainer.className = 'ml-4 mb-2';
          arrayContainer.innerHTML = `<div class="text-sm font-medium text-gray-700 mb-1">${key} (Array):</div>`;
          
          const addButton = document.createElement('button');
          addButton.textContent = `Add ${key} Item`;
          addButton.className = 'bg-blue-500 text-white px-2 py-1 rounded text-sm mb-2';
          addButton.onclick = () => addArrayItem(arrayContainer, value[0], fullKey);
          
          dynamicForm.appendChild(arrayContainer);
          arrayContainer.appendChild(addButton);
          addArrayItem(arrayContainer, value[0], fullKey); // Add first item by default
        } else if (value && typeof value === 'object') {
          if (value.type) {
            // This is a field definition
            createFormField(fullKey, value);
          } else {
            // This is a nested object
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'border rounded p-2 mb-2';
            fieldset.innerHTML = `<legend class="text-sm font-medium text-gray-700 px-2">${key}</legend>`;
            dynamicForm.appendChild(fieldset);
            generateFormFromSchema(value, fullKey, level + 1);
          }
        }
      });
    }
  
    function createFormField(key, schema) {
      const container = document.createElement('div');
      container.className = 'form-row';
      
      const label = document.createElement('label');
      label.className = 'form-label text-sm font-medium text-gray-700';
      label.textContent = `${key}${schema.default ? ' (default: ' + schema.default + ')' : ''}`;
      
      const input = document.createElement(schema.type === 'enum' ? 'select' : 'input');
      input.className = 'form-input p-2 border border-gray-300 rounded-md';
      input.setAttribute('data-key', key);
      
      if (schema.type === 'enum') {
        schema.values.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          input.appendChild(option);
        });
      } else {
        input.type = schema.type === 'integer' ? 'number' : 'text';
        if (schema.type === 'integer') {
          input.step = '1';
          if (schema.max) input.max = schema.max;
        }
      }
      
      if (schema.default) {
        input.value = schema.default;
      }
      
      if (schema.description) {
        input.title = schema.description;
      }
      
      container.appendChild(label);
      container.appendChild(input);
      dynamicForm.appendChild(container);
    }
  
    function addArrayItem(container, schema, arrayKey) {
      const itemContainer = document.createElement('div');
      itemContainer.className = 'border-l-2 border-blue-200 pl-2 mb-2';
      container.appendChild(itemContainer);
      
      generateFormFromSchema(schema, `${arrayKey}[${container.children.length - 2}]`, 1);
      
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.className = 'bg-red-500 text-white px-2 py-1 rounded text-sm';
      removeButton.onclick = () => {
        container.removeChild(itemContainer);
        updateArrayIndices(container, arrayKey);
      };
      
      itemContainer.appendChild(removeButton);
    }
  
    function updateArrayIndices(container, arrayKey) {
      const items = container.querySelectorAll('div.border-l-2');
      items.forEach((item, index) => {
        const inputs = item.querySelectorAll('input, select');
        inputs.forEach(input => {
          const key = input.getAttribute('data-key');
          const newKey = key.replace(/\[\d+\]/, `[${index}]`);
          input.setAttribute('data-key', newKey);
        });
      });
    }
  
    function collectFormData() {
      const formData = {};
      const inputs = dynamicForm.querySelectorAll('input, select');
      
      inputs.forEach(input => {
        const key = input.getAttribute('data-key');
        const value = input.type === 'number' ? Number(input.value) : input.value;
        
        if (key.includes('[')) {
          // Handle array fields
          const [arrayKey, indexStr] = key.match(/(.+?)\[(\d+)\]/).slice(1);
          const index = parseInt(indexStr);
          const keys = arrayKey.split('.');
          
          let current = formData;
          keys.forEach((k, i) => {
            if (i === keys.length - 1) {
              if (!Array.isArray(current[k])) {
                current[k] = [];
              }
              if (!current[k][index]) {
                current[k][index] = {};
              }
              const path = key.split(']')[1]?.split('.').filter(Boolean);
              if (path) {
                let target = current[k][index];
                path.slice(0, -1).forEach(p => {
                  if (!target[p]) target[p] = {};
                  target = target[p];
                });
                target[path[path.length - 1]] = value;
              } else {
                current[k][index] = value;
              }
            } else {
              current[k] = current[k] || {};
              current = current[k];
            }
          });
        } else {
          // Handle regular fields
          const keys = key.split('.');
          let current = formData;
          keys.forEach((k, i) => {
            if (i === keys.length - 1) {
              current[k] = value;
            } else {
              current[k] = current[k] || {};
              current = current[k];
            }
          });
        }
      });
      
      return formData;
    }
  
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
        const isStreaming = streamingToggle.checked;
    
        if (!curl || !currentSchema) {
          responseArea.innerHTML = '<span class="text-red-500">Please provide both CURL command and valid JSON schema.</span>';
          return;
        }
    
        // Collect form data
        const formData = collectFormData();
    
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
              formData: formData  // Send form data separately
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
                formData: formData  // Send form data separately
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

## v7/background.js

```js
function parseCurl(curlCommand) {
    const urlMatch = curlCommand.match(/curl\s+(?:(?:https?:)?\/\/)?([^\s]+)/);
    if (!urlMatch) throw new Error('Invalid CURL command: URL not found');
  
    let url = urlMatch[0].replace('curl ', '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
    }
    
    const headerRegexes = [
        /(?:-H|--header)\s+"([^"]+)"/g,
        /(?:-H|--header)\s+'([^']+)'/g
    ];
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    headerRegexes.forEach(regex => {
        let match;
        while ((match = regex.exec(curlCommand)) !== null) {
            const headerContent = match[1];
            const separatorIndex = headerContent.indexOf(':');
            if (separatorIndex !== -1) {
                const key = headerContent.slice(0, separatorIndex).trim();
                const value = headerContent.slice(separatorIndex + 1).trim();
                headers[key] = value;
            }
        }
    });
  
    // Get the data after -d flag
    const dataMatch = curlCommand.match(/(?:-d|--data|--data-raw)\s+(\$data_json_schema\$)/);
    if (!dataMatch) {
        throw new Error('Could not find $data_json_schema$ placeholder in CURL command');
    }
  
    return { url, headers, data: null }; // data will be provided from popup.js
}

async function makeRequest({ url, headers, data }) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: typeof data === 'string' ? data : JSON.stringify(data)
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
            body: typeof parsedCurl.data === 'string' ? parsedCurl.data : JSON.stringify(parsedCurl.data)
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
        const { curlCommand, formData } = request; // Now also expecting formData
        
        try {
            const parsedCurl = parseCurl(curlCommand);
            parsedCurl.data = formData; // Use the form data directly
            
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
                const parsedCurl = parseCurl(request.curlCommand);
                await handleStreamingRequest(port, parsedCurl);
            } catch (error) {
                port.postMessage({ error: error.message });
            }
        }
    });
});
```

## v7/popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Request Handler</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
  <style>
    body {
      width: 800px;
      min-height: 600px;
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
    #curlInput, #schemaInput {
      height: 150px;
    }
    .help-text {
      display: block;
      font-size: 0.75rem;
      color: #6B7280;
      margin-top: 0.25rem;
    }
    .dynamic-form {
      max-height: 400px;
      overflow-y: auto;
    }
    .error-text {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .form-row {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      background: #f9fafb;
      border-radius: 0.375rem;
    }
    .form-label {
      flex: 1;
      padding-right: 1rem;
    }
    .form-input {
      flex: 2;
    }
  </style>
</head>
<body class="bg-gray-50">
  <div class="max-w-4xl mx-auto">
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">CURL Command Template</label>
      <textarea id="curlInput" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter your CURL command with $data_json_schema$ placeholder..."></textarea>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">JSON Schema</label>
      <textarea id="schemaInput" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter your JSON-Lite schema..."></textarea>
      <div id="schemaError" class="error-text hidden"></div>
    </div>

    <div class="mb-4">
      <label class="flex items-center space-x-2">
        <input type="checkbox" id="streamingToggle" class="form-checkbox">
        <span class="text-sm font-medium text-gray-700">Enable Streaming</span>
      </label>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700">Dynamic Form</label>
      <div id="dynamicForm" class="dynamic-form mt-2 border border-gray-200 rounded-md p-4">
        <div class="text-gray-500 text-sm text-center p-4">
          Enter a valid JSON schema above to generate the form
        </div>
      </div>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700">
        Output Path for Response JSON Processing
      </label>
      <span class="help-text">Leave empty to see full response</span>
      <input type="text" id="outputPath" class="w-full p-2 border border-gray-300 rounded-md mt-1" placeholder="e.g., choices[0].message.content">
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

