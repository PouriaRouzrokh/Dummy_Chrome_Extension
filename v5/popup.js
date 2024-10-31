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