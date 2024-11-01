document.addEventListener('DOMContentLoaded', () => {
  const textArea = document.getElementById('modifiedTextArea');
  const renameButton = document.getElementById('renameButton');

  // Get the modified text from storage when the side panel is opened
  chrome.storage.local.get('modifiedText', (data) => {
    if (data.modifiedText) {
      console.log("Retrieved modified text from storage:", data.modifiedText);
      textArea.value = data.modifiedText;
    } else {
      textArea.value = "No text available. Select text on the page and use the context menu to modify it.";
    }
  });

  // Rename button click event
  renameButton.addEventListener('click', () => {
    const uppercaseText = document.getElementById('uppercaseText').value;
    const capitalizeText = document.getElementById('capitalizeText').value;
    const reverseText = document.getElementById('reverseText').value;

    // Send the new names to the background script
    chrome.runtime.sendMessage({
      type: 'renameMacros',
      uppercaseText,
      capitalizeText,
      reverseText
    }, (response) => {
      if (response.status === 'success') {
        console.log('Macros renamed successfully');
      }
    });
  });
});
