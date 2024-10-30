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