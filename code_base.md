## v3/styles.css

```css
body {
    width: 400px;
    height: 600px;
    overflow-y: auto;
    background-color: #f8f9fa;
    font-size: 14px;
}

.container {
    max-width: 100%;
    padding: 15px;
}

.card {
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header {
    background-color: #007bff;
    color: white;
}

.btn-add {
    margin-bottom: 20px;
}

.api-key {
    font-family: monospace;
}

/* Ensure modal fits within popup */
.modal-dialog {
    max-width: 90%;
    margin: 1.75rem auto;
}

/* Adjust font sizes for popup */
h1 {
    font-size: 1.5rem;
}

.card-title {
    font-size: 1.1rem;
}

.card-text {
    font-size: 0.9rem;
}

.btn {
    font-size: 0.8rem;
}
```

## v3/background.js

```js
chrome.runtime.onInstalled.addListener(() => {
    console.log('LLM API Manager extension installed');
});
```

## v3/default-apis.js

```js
const defaultApis = [
  {
      provider: "OpenAI",
      description: "GPT-3.5 and GPT-4 models for natural language processing",
      apiKey: "aa",
      dateCreated: "2023-01-15"
  },
  {
      provider: "Anthropic",
      description: "Claude AI models for various language tasks",
      apiKey: "bb",
      dateCreated: "2023-03-22"
  },
  {
      provider: "Google",
      description: "PaLM API for text generation and analysis",
      apiKey: "cc",
      dateCreated: "2023-05-10"
  },
  {
      provider: "Cohere",
      description: "Large language models for text generation and understanding",
      apiKey: "dd",
      dateCreated: "2023-02-28"
  }
];

export { defaultApis };
```

## v3/api-manager.js

```js
import { defaultApis } from './default-apis.js';

let apis = [];
let apiModal;

document.addEventListener('DOMContentLoaded', function() {
    const apiList = document.getElementById('apiList');
    const addApiBtn = document.getElementById('addApiBtn');
    const saveApiBtn = document.getElementById('saveApiBtn');
    
    // Initialize Bootstrap modal
    apiModal = new bootstrap.Modal(document.getElementById('apiModal'));

    function loadAPIs() {
        chrome.storage.sync.get(['apis'], function(result) {
            if (result.apis && result.apis.length > 0) {
                apis = result.apis;
            } else {
                apis = defaultApis;
                saveAPIs();
            }
            renderAPIList();
        });
    }

    function saveAPIs() {
        chrome.storage.sync.set({apis: apis}, function() {
            console.log('APIs saved');
        });
    }

    function renderAPIList() {
        apiList.innerHTML = '';
        apis.forEach((api, index) => {
            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = `
                <div class="card-header">
                    <h5 class="card-title">${api.provider}</h5>
                </div>
                <div class="card-body">
                    <p class="card-text">${api.description}</p>
                    <p class="card-text"><small class="text-muted">Created: ${api.dateCreated}</small></p>
                    <p class="card-text">API Key: <span class="api-key">****${api.apiKey.slice(-4)}</span></p>
                    <button class="btn btn-sm btn-primary edit-btn" data-index="${index}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-index="${index}">Delete</button>
                </div>
            `;
            apiList.appendChild(card);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => editAPI(e.target.dataset.index));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteAPI(e.target.dataset.index));
        });
    }

    function addAPI() {
        document.getElementById('apiId').value = '';
        document.getElementById('apiForm').reset();
        document.getElementById('apiModalLabel').textContent = 'Add New API';
        apiModal.show();
    }

    function editAPI(index) {
        const api = apis[index];
        document.getElementById('apiId').value = index;
        document.getElementById('modelProvider').value = api.provider;
        document.getElementById('description').value = api.description;
        document.getElementById('apiKey').value = api.apiKey;
        document.getElementById('apiModalLabel').textContent = 'Edit API';
        apiModal.show();
    }

    function deleteAPI(index) {
        if (confirm('Are you sure you want to delete this API?')) {
            apis.splice(index, 1);
            saveAPIs();
            renderAPIList();
        }
    }

    function saveAPI() {
        const id = document.getElementById('apiId').value;
        const api = {
            provider: document.getElementById('modelProvider').value,
            description: document.getElementById('description').value,
            apiKey: document.getElementById('apiKey').value,
            dateCreated: id === '' ? new Date().toISOString().split('T')[0] : apis[parseInt(id)].dateCreated
        };

        if (id === '') {
            apis.push(api);
        } else {
            apis[parseInt(id)] = api;
        }

        saveAPIs();
        renderAPIList();
        apiModal.hide();
    }

    // Event listeners
    addApiBtn.addEventListener('click', addAPI);
    saveApiBtn.addEventListener('click', saveAPI);

    // Load APIs on page load
    loadAPIs();
});
```

## v3/api-manager.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM API Manager</title>
    <link href="lib/css/bootstrap.min.css" rel="stylesheet">
    <link href="styles.css" rel="stylesheet">
</head>
<body>
    <div class="container" style="width: 400px;">
        <h1 class="text-center mb-4">LLM API Manager</h1>
        <button id="addApiBtn" class="btn btn-primary btn-add mb-3" data-bs-toggle="modal" data-bs-target="#apiModal">Add New API</button>
        <div id="apiList"></div>
    </div>

    <!-- Modal for adding/editing API -->
    <div class="modal fade" id="apiModal" tabindex="-1" aria-labelledby="apiModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="apiModalLabel">Add/Edit API</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="apiForm">
                        <input type="hidden" id="apiId">
                        <div class="mb-3">
                            <label for="modelProvider" class="form-label">Model Provider</label>
                            <input type="text" class="form-control" id="modelProvider" required>
                        </div>
                        <div class="mb-3">
                            <label for="description" class="form-label">Description</label>
                            <input type="text" class="form-control" id="description" required>
                        </div>
                        <div class="mb-3">
                            <label for="apiKey" class="form-label">API Key</label>
                            <input type="text" class="form-control" id="apiKey" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveApiBtn">Save</button>
                </div>
            </div>
        </div>
    </div>
    <script src="lib/js/bootstrap.bundle.min.js"></script>
    <script src="default-apis.js" type="module"></script>
    <script src="api-manager.js" type="module"></script>
</body>
</html>
```

## Excluded Files

- **v3/lib/.DS_Store**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.rtl.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.rtl.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.rtl.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.rtl.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.rtl.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.rtl.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.rtl.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.rtl.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.rtl.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.rtl.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap.rtl.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.rtl.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.rtl.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-utilities.rtl.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.rtl.min.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.min.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-grid.rtl.css**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/css/bootstrap-reboot.css.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.esm.min.js**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.esm.js**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.bundle.js**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.bundle.min.js.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.bundle.js.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.esm.js.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.js**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.bundle.min.js**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.min.js**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.esm.min.js.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.js.map**: This file is present, but its content was not captured in this list for brevity.
- **v3/lib/js/bootstrap.min.js.map**: This file is present, but its content was not captured in this list for brevity.
