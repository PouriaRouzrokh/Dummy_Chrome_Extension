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
      const parsedCurl = parseCurl(curl, message);
      const response = await makeRequest(parsedCurl);
      rawResponse = response;
      displayResponse(response);
    } catch (error) {
      loadingIndicator.style.display = 'none';
      responseArea.innerHTML = `<span class="text-red-500">Error: ${error.message}</span>`;
    }
  });

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

function parseCurl(curlCommand, message) {
  const processedCommand = curlCommand.replace(/\$message\$/g, message);
  
  const urlMatch = processedCommand.match(/curl\s+(https?:\/\/[^\s]+)/);
  const headerMatches = processedCommand.match(/-H\s+"([^"]+)"/g);
  const dataMatch = processedCommand.match(/-d\s+'([^']+)'/);

  if (!urlMatch) throw new Error('Invalid CURL command: URL not found');

  const url = urlMatch[1];
  const headers = {};
  
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
    } catch (e) {
      data = dataMatch[1];
    }
  }

  return { url, headers, data };
}

async function makeRequest({ url, headers, data }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}