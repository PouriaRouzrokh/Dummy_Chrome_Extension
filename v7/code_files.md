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
      const schemaContent = this.value.trim();
      
      if (!schemaContent) {
          schemaError.textContent = 'Please enter a JSON schema';
          schemaError.classList.remove('hidden');
          dynamicForm.innerHTML = '<div class="text-gray-500 text-sm text-center p-4">Enter a valid JSON schema to generate the form</div>';
          currentSchema = null;
          return;
      }

      try {
          const schema = JSON.parse(schemaContent);
          schemaError.classList.add('hidden');
          generateFormFromSchema(schema);
          currentSchema = schema;
          
          // Save schema
          chrome.storage.local.set({ jsonSchema: schemaContent });
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
            
            // Special handling for messages array to maintain initial messages
            if (key === 'messages' && Array.isArray(value)) {
                const arrayContainer = document.createElement('div');
                arrayContainer.className = 'mb-4 bg-gray-50 rounded-lg p-4';
                
                const arrayHeader = document.createElement('div');
                arrayHeader.className = 'flex justify-between items-center mb-3';
                
                const arrayTitle = document.createElement('div');
                arrayTitle.className = 'text-sm font-medium text-gray-700';
                arrayTitle.textContent = 'Messages';
                arrayHeader.appendChild(arrayTitle);
                
                const addButton = document.createElement('button');
                addButton.textContent = 'Add Message';
                addButton.className = 'bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors';
                addButton.onclick = () => addArrayItem(arrayItemsContainer, value[value.length - 1], fullKey);
                arrayHeader.appendChild(addButton);
                
                arrayContainer.appendChild(arrayHeader);
                
                const arrayItemsContainer = document.createElement('div');
                arrayItemsContainer.className = 'space-y-4';
                arrayContainer.appendChild(arrayItemsContainer);
                
                dynamicForm.appendChild(arrayContainer);

                // Create initial messages based on schema
                value.forEach((messageSchema, index) => {
                    // For the first N-1 messages, don't allow removal
                    const isInitialMessage = index < value.length - 1;
                    addArrayItem(arrayItemsContainer, messageSchema, fullKey, isInitialMessage);
                });
            } else if (Array.isArray(value)) {
                // Handle other arrays as before
                const arrayContainer = document.createElement('div');
                arrayContainer.className = 'mb-4 bg-gray-50 rounded-lg p-4';
                
                const arrayHeader = document.createElement('div');
                arrayHeader.className = 'flex justify-between items-center mb-3';
                
                const arrayTitle = document.createElement('div');
                arrayTitle.className = 'text-sm font-medium text-gray-700';
                arrayTitle.textContent = `${key} (Array)`;
                arrayHeader.appendChild(arrayTitle);
                
                const addButton = document.createElement('button');
                addButton.textContent = `Add ${key} Item`;
                addButton.className = 'bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors';
                addButton.onclick = () => addArrayItem(arrayItemsContainer, value[0], fullKey);
                arrayHeader.appendChild(addButton);
                
                arrayContainer.appendChild(arrayHeader);
                
                const arrayItemsContainer = document.createElement('div');
                arrayItemsContainer.className = 'space-y-4';
                arrayContainer.appendChild(arrayItemsContainer);
                
                dynamicForm.appendChild(arrayContainer);

                if (value.length > 0) {
                    addArrayItem(arrayItemsContainer, value[0], fullKey, true);
                }
            } else if (value && typeof value === 'object') {
                if (value.type) {
                    createFormField(fullKey, value);
                } else {
                    const fieldset = document.createElement('fieldset');
                    fieldset.className = 'mb-4 border rounded-lg p-4';
                    fieldset.innerHTML = `<legend class="px-2 text-sm font-medium text-gray-700">${key}</legend>`;
                    dynamicForm.appendChild(fieldset);
                    generateFormFromSchema(value, fullKey, level + 1);
                }
            }
        });
    }
  
    function createFormField(key, schema) {
        const container = document.createElement('div');
        container.className = 'mb-4 p-3 bg-gray-50 rounded-lg';
        
        // Create label group
        const labelGroup = document.createElement('div');
        labelGroup.className = 'mb-2';
        
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700 mb-1';
        label.textContent = key;
        
        // Add default value indicator if exists
        if (schema.default !== undefined) {
            const defaultSpan = document.createElement('span');
            defaultSpan.className = 'ml-1 text-sm text-gray-500';
            defaultSpan.textContent = `(default: ${schema.default})`;
            label.appendChild(defaultSpan);
        }
        
        labelGroup.appendChild(label);
        
        // Add description/hint if exists
        if (schema.description) {
            const helpText = document.createElement('div');
            helpText.className = 'text-xs text-gray-500';
            helpText.textContent = schema.description;
            labelGroup.appendChild(helpText);
        }
        
        container.appendChild(labelGroup);
        
        let input;
        
        // Handle different input types
        if (schema.type === 'boolean') {
            input = document.createElement('select');
            input.className = 'mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500';
            
            const trueOption = document.createElement('option');
            trueOption.value = 'true';
            trueOption.textContent = 'true';
            
            const falseOption = document.createElement('option');
            falseOption.value = 'false';
            falseOption.textContent = 'false';
            
            input.appendChild(trueOption);
            input.appendChild(falseOption);
            
            // Set default value
            input.value = schema.default.toString();
        } else if (schema.type === 'enum') {
            input = document.createElement('select');
            input.className = 'mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500';
            
            schema.values.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                if (value === schema.default) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.className = 'mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500';
            input.type = schema.type === 'integer' ? 'number' : 'text';
            if (schema.type === 'integer') {
                input.step = '1';
                if (schema.max) input.max = schema.max;
            }
            if (schema.default !== undefined) {
                input.value = schema.default;
            }
        }
        
        input.setAttribute('data-key', key);
        input.setAttribute('data-type', schema.type);
        
        // Make sure default values are set
        if (schema.default !== undefined && input.value === '') {
            input.value = schema.default;
        }
        
        container.appendChild(input);
        dynamicForm.appendChild(container);
    }
  
    function addArrayItem(container, schema, arrayKey, isInitialMessage = false) {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'mb-4 ml-4 p-3 border-l-2 border-blue-200';
        container.appendChild(itemContainer);

        // Add array item header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex justify-between items-center mb-3';
        
        const itemTitle = document.createElement('div');
        itemTitle.className = 'text-sm font-medium text-gray-700';
        itemTitle.textContent = isInitialMessage ? 
            `Initial Message ${container.querySelectorAll('.border-l-2').length}` :
            `Message ${container.querySelectorAll('.border-l-2').length}`;
        headerDiv.appendChild(itemTitle);

        // Only add remove button if it's not an initial message
        if (!isInitialMessage) {
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.className = 'bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600 transition-colors';
            removeButton.onclick = () => {
                container.removeChild(itemContainer);
                updateArrayIndices(container, arrayKey);
            };
            headerDiv.appendChild(removeButton);
        }

        itemContainer.appendChild(headerDiv);

        // Calculate the index for this item
        const existingItems = container.querySelectorAll('.border-l-2').length - 1;
        const itemIndex = existingItems;
        
        // Create fields container
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'space-y-3';
        
        // Generate form fields for this item
        Object.entries(schema).forEach(([key, value]) => {
            const fieldKey = `${arrayKey}[${itemIndex}].${key}`;
            if (typeof value === 'object' && value !== null) {
                const fieldContainer = document.createElement('div');
                fieldContainer.className = 'bg-white rounded-md p-2';
                fieldsContainer.appendChild(fieldContainer);
                
                const originalAppend = dynamicForm.appendChild.bind(dynamicForm);
                dynamicForm.appendChild = fieldContainer.appendChild.bind(fieldContainer);
                createFormField(fieldKey, value);
                dynamicForm.appendChild = originalAppend;
            }
        });
        
        itemContainer.appendChild(fieldsContainer);
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
        
        // First pass: collect all form data
        inputs.forEach(input => {
            const key = input.getAttribute('data-key');
            const type = input.getAttribute('data-type');
            let value = input.value;
            
            // Convert values based on type
            if (type === 'boolean') {
                value = value === 'true';
            } else if (type === 'integer') {
                value = value === '' ? null : Number(value);
            }
            
            // Don't include empty values unless they're explicitly set to 0 or false
            if (value === '' && value !== 0 && value !== false) {
                return;
            }
            
            if (key.includes('[')) {
                // Handle array fields
                const [arrayKey, indexStr] = key.match(/(.+?)\[(\d+)\]/).slice(1);
                const index = parseInt(indexStr);
                const keys = arrayKey.split('.');
                
                let current = formData;
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    if (i === keys.length - 1) {
                        if (!Array.isArray(current[k])) {
                            current[k] = [];
                        }
                        // Ensure array has enough space
                        while (current[k].length <= index) {
                            current[k].push({});
                        }
                        
                        const remainingPath = key.split(']')[1]?.split('.').filter(Boolean);
                        if (remainingPath && remainingPath.length > 0) {
                            let target = current[k][index];
                            remainingPath.forEach((p, i) => {
                                if (i === remainingPath.length - 1) {
                                    target[p] = value;
                                } else {
                                    target[p] = target[p] || {};
                                    target = target[p];
                                }
                            });
                        } else {
                            current[k][index] = value;
                        }
                    } else {
                        current[k] = current[k] || {};
                        current = current[k];
                    }
                }
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
  
        // Ensure messages array exists and has at least one item with required fields
        if (!formData.messages || !Array.isArray(formData.messages)) {
            formData.messages = [];
        }
        if (formData.messages.length === 0) {
            formData.messages.push({
                role: 'user',
                content: ''
            });
        }

        // Ensure each message has both role and content
        formData.messages = formData.messages.map(message => ({
            role: message.role || 'user',
            content: message.content || ''
        }));

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
                              } else {
                                  console.log('Streaming chunk:', msg.content);
                                  console.log('Path:', pathExp);
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
      const curl = curlInput.value.trim();
      const isStreaming = streamingToggle.checked;
      const schemaContent = schemaInput.value.trim();
  
      // More detailed validation
      if (!curl) {
          responseArea.innerHTML = '<span class="text-red-500">Please provide a CURL command.</span>';
          return;
      }
  
      if (!schemaContent) {
          responseArea.innerHTML = '<span class="text-red-500">Please provide a JSON schema.</span>';
          return;
      }
  
      if (!curl.includes('$data_json_schema$')) {
          responseArea.innerHTML = '<span class="text-red-500">CURL command must contain $data_json_schema$ placeholder.</span>';
          return;
      }
  
      try {
          // Validate schema parsing
          if (!currentSchema) {
              const parsedSchema = JSON.parse(schemaContent);
              currentSchema = parsedSchema;
              generateFormFromSchema(parsedSchema);
          }
      } catch (error) {
          responseArea.innerHTML = `<span class="text-red-500">Invalid JSON schema: ${error.message}</span>`;
          return;
      }
  
      // Collect form data
      const formData = collectFormData();
  
      // Save settings
      chrome.storage.local.set({ 
          curlCommand: curl,
          outputPath: outputPath.value,
          jsonSchema: schemaContent
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
    
            // Make sure formData includes the model and all required fields
            const formData = collectFormData();
            
            // For streaming requests, ensure stream is set to true
            formData.stream = true;
    
            currentPort.postMessage({ 
                type: 'makeStreamingRequest',
                curlCommand: curl,
                formData: formData
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
                      formData: formData
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
              // Log the response and path for debugging
              console.log('Response:', response);
              console.log('Path:', pathExpression);
              responseArea.innerHTML = `<span class="text-red-500">No value found at the specified path: ${pathExpression}</span>`;
          }
      } catch (error) {
          console.error('Error:', error);
          responseArea.innerHTML = `<span class="text-red-500">Error extracting value: ${error.message}</span>`;
      }
    }
  
    function extractValue(obj, path) {
      if (!path) return obj;
      
      try {
          // Split the path and handle array notation
          const parts = path.split('.').map(part => {
              if (part.includes('[') && part.includes(']')) {
                  // Handle array access
                  const [arrayName, indexStr] = part.split('[');
                  const index = parseInt(indexStr.replace(']', ''));
                  return { arrayName, index };
              }
              return part;
          });
  
          let current = obj;
          
          for (const part of parts) {
              if (typeof part === 'object') {
                  // This is an array access
                  const { arrayName, index } = part;
                  if (!current[arrayName] || !Array.isArray(current[arrayName])) {
                      console.log('Array not found:', arrayName, 'in', current);
                      return undefined;
                  }
                  if (index >= current[arrayName].length) {
                      console.log('Array index out of bounds:', index, 'for', arrayName);
                      return undefined;
                  }
                  current = current[arrayName][index];
              } else {
                  // Regular property access
                  if (current === undefined || current === null || !(part in current)) {
                      console.log('Property not found:', part, 'in', current);
                      return undefined;
                  }
                  current = current[part];
              }
          }
          
          return current;
      } catch (error) {
          console.error('Error in extractValue:', error);
          throw error;
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
        throw error;
    }
}

async function handleStreamingRequest(port, parsedCurl) {
    try {
        // Make sure data is properly set
        console.log('Streaming request data:', parsedCurl.data); // Debug log

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
        const { curlCommand, formData } = request;
        
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
                parsedCurl.data = request.formData; // Make sure we use the formData from the request
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

