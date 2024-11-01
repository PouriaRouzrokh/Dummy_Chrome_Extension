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