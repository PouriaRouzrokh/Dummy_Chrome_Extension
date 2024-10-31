// Listen for connections
chrome.runtime.onConnect.addListener(function(port) {
    console.log("Connection established", port.name);
    
    if (port.name !== "chat-stream") return;
  
    // Listen for messages on this port
    port.onMessage.addListener(async function(msg) {
      console.log("Received message in background", msg);
      
      if (!msg.message || !msg.apiKey) {
        port.postMessage({ error: "Missing message or API key" });
        return;
      }
  
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${msg.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant.'
              },
              {
                role: 'user',
                content: msg.message
              }
            ],
            stream: true
          })
        });
  
        if (!response.ok) {
          const error = await response.text();
          port.postMessage({ error: `API Error: ${error}` });
          return;
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
              if (line.includes('[DONE]')) continue;
              
              try {
                const cleanLine = line.replace(/^data: /, '');
                if (cleanLine === '[DONE]') continue;
                
                const parsed = JSON.parse(cleanLine);
                if (parsed.choices[0].delta.content) {
                  port.postMessage({ content: parsed.choices[0].delta.content });
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          port.postMessage({ error: `Stream error: ${error.message}` });
        }
      } catch (error) {
        console.error('Fetch error:', error);
        port.postMessage({ error: `Fetch error: ${error.message}` });
      }
    });
  
    // Handle disconnect
    port.onDisconnect.addListener(function() {
      console.log("Port disconnected");
    });
  });
  
  // Log that background script is loaded
  console.log("Background script loaded");