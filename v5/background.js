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