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