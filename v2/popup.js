import { defaultModels } from './default-models.js';

document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const systemPromptInput = document.getElementById('systemPrompt');
  const inputPromptInput = document.getElementById('inputPrompt');
  const modelForm = document.getElementById('modelForm');
  const resultDiv = document.getElementById('result');

  // Populate model select options
  Object.keys(defaultModels).forEach(modelKey => {
    const option = document.createElement('option');
    option.value = modelKey;
    option.textContent = defaultModels[modelKey].MODEL_NAME;
    modelSelect.appendChild(option);
  });

  // Update system prompt when model is selected
  modelSelect.addEventListener('change', function() {
    const selectedModel = defaultModels[this.value];
    if (selectedModel) {
      systemPromptInput.value = selectedModel.SYSTEM_PROMPT;
    }
  });

  modelForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const selectedModelKey = modelSelect.value;
    const systemPrompt = systemPromptInput.value;
    const inputPrompt = inputPromptInput.value;

    if (!selectedModelKey) {
      alert('Please select a model');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'executeModel',
      modelKey: selectedModelKey,
      systemPrompt: systemPrompt,
      inputPrompt: inputPrompt
    }, response => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        resultDiv.innerHTML = `<p class="text-danger">Error: ${chrome.runtime.lastError.message}</p>`;
        return;
      }
      if (response.error) {
        resultDiv.innerHTML = `<p class="text-danger">Error: ${response.error}</p>`;
      } else {
        resultDiv.innerHTML = `
          <h3>Raw API Response:</h3>
          <pre>${response.result}</pre>
        `;
      }
    });
  });
});