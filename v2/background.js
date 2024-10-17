import { defaultModels } from './default-models.js';

chrome.runtime.onInstalled.addListener(() => {
  // Set default model on installation
  chrome.storage.sync.set({ currentModel: 'gpt-4o-mini' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request); // For debugging
  if (request.action === 'getModel') {
    chrome.storage.sync.get('currentModel', (data) => {
      const modelKey = data.currentModel || 'gpt-4o-mini';
      sendResponse({ model: defaultModels[modelKey] });
    });
    return true; // Indicates that the response is asynchronous
  } else if (request.action === 'executeModel') {
    executeModel(request, sendResponse);
    return true; // Indicates that the response is asynchronous
  }
});

async function executeModel(request, sendResponse) {
  const { modelKey, systemPrompt, inputPrompt } = request;
  const modelConfig = defaultModels[modelKey];

  try {
    let curlCommand = modelConfig.CURL_SCHEMA
      .replace('$SYSTEM_PROMPT', systemPrompt)
      .replace('$INPUT', inputPrompt)
      .replace('$OPENAI_API_KEY', modelConfig.OPENAI_API_KEY);

    // Parse curl command
    const url = curlCommand.match(/"([^"]+)"/)[1];
    const headers = {};
    const headerMatches = curlCommand.matchAll(/-H "([^:]+): ([^"]+)"/g);
    for (const match of headerMatches) {
      headers[match[1]] = match[2];
    }
    const body = JSON.parse(curlCommand.match(/-d '(.+)'/s)[1]);

    // Execute fetch request
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API response:', JSON.stringify(data, null, 2));

    const aiResponse = parseResponse(data, modelConfig.RESPONSE_PARSER);

    if (aiResponse === null) {
      console.error('Failed to parse response using:', modelConfig.RESPONSE_PARSER);
      sendResponse({ error: 'Failed to parse AI response' });
    } else {
      sendResponse({ result: aiResponse });
    }
  } catch (error) {
    console.error('Error in executeModel:', error);
    sendResponse({ error: error.message });
  }
}

function parseResponse(data, parser) {
    console.log('Parsing data:', JSON.stringify(data, null, 2));
    console.log('Using parser:', parser);
    
    const parts = parser.split('.');
    let result = data;
    
    for (const part of parts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part];
      } else {
        console.error(`Failed to parse: ${part} not found in`, result);
        return null;
      }
    }
    
    return result;
}