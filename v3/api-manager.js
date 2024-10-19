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