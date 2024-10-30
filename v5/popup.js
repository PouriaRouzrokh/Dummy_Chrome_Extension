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