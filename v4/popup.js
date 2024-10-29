// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('functionEditor');
  const saveButton = document.getElementById('saveFunction');
  const runButton = document.getElementById('runFunction');
  const resultDiv = document.getElementById('result');

  // Load saved function on popup open
  try {
    const result = await chrome.storage.local.get('savedFunction');
    if (result.savedFunction) {
      editor.value = result.savedFunction;
    }
  } catch (error) {
    showResult('Error loading saved function: ' + error.message, true);
  }

  // Save function to chrome.storage
  saveButton.addEventListener('click', async () => {
    const functionCode = editor.value;
    
    try {
      // Basic syntax validation without eval
      if (!functionCode.trim().startsWith('function processPage(')) {
        throw new Error('Function must start with "function processPage("');
      }
      
      if (!functionCode.includes('return')) {
        throw new Error('Function must include a return statement');
      }

      // Count braces to ensure they match
      const openBraces = (functionCode.match(/{/g) || []).length;
      const closeBraces = (functionCode.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        throw new Error('Mismatched braces in function');
      }

      await chrome.storage.local.set({ savedFunction: functionCode });
      showResult('Function saved successfully!', false, true);
    } catch (error) {
      showResult('Error saving function: ' + error.message, true);
    }
  });

  // Run the saved function
  runButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.startsWith('http')) {
        throw new Error('This extension can only run on web pages.');
      }

      // Get the saved function
      const result = await chrome.storage.local.get('savedFunction');
      if (!result.savedFunction) {
        throw new Error('No function saved. Please save a function first.');
      }

      // First inject setup code
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Create a global variable to store the result
          window.__customFunctionResult = undefined;
          
          // Create a function to store the result
          window.__storeResult = (result) => {
            window.__customFunctionResult = result;
          };
        }
      });

      // Then inject and execute the function
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (functionCode) => {
          try {
            // Create script element with the function and immediate execution
            const script = document.createElement('script');
            script.textContent = `
              ${functionCode}
              window.__storeResult(processPage());
            `;
            document.documentElement.appendChild(script);
            script.remove();
          } catch (error) {
            window.__storeResult({ error: error.message });
          }
        },
        args: [result.savedFunction]
      });

      // Finally, retrieve the result
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const result = window.__customFunctionResult;
          // Cleanup
          delete window.__customFunctionResult;
          delete window.__storeResult;
          return result;
        }
      });

      // Show results
      const executionResult = results[0].result;
      if (executionResult && executionResult.error) {
        showResult(`Error: ${executionResult.error}`, true);
      } else {
        showResult(JSON.stringify(executionResult, null, 2), false);
      }
    } catch (error) {
      showResult(`Extension Error: ${error.message}`, true);
    }
  });

  function showResult(message, isError = false, isSuccess = false) {
    resultDiv.textContent = message;
    resultDiv.classList.remove('error', 'success');
    if (isError) resultDiv.classList.add('error');
    if (isSuccess) resultDiv.classList.add('success');
    resultDiv.classList.add('result-visible');
  }
});