document.addEventListener("DOMContentLoaded", () => {
    const addButton = document.getElementById("add-emby-url") as HTMLButtonElement;
    const urlsList = document.getElementById("emby-urls-list") as HTMLDivElement;
    
    let embyUrls: string[] = [];
    
    const renderUrls = () => {
        urlsList.innerHTML = "";
        
        if (embyUrls.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            emptyState.textContent = "No Emby URLs added yet";
            urlsList.appendChild(emptyState);
            return;
        }
        
        embyUrls.forEach((url, index) => {
            const urlDiv = document.createElement("div");
            urlDiv.className = "url-item";
            
            const input = document.createElement("input");
            input.type = "text";
            input.value = url;
            input.className = "url-input";
            input.placeholder = "Enter Emby URL (e.g., http://your-emby-server.com)";
            input.addEventListener("change", () => {
                embyUrls[index] = input.value;
                chrome.storage.local.set({embyUrls: embyUrls});
            });
            
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-button";
            deleteButton.addEventListener("click", () => {
                embyUrls.splice(index, 1);
                chrome.storage.local.set({embyUrls: embyUrls});
                renderUrls();
            });
            
            urlDiv.appendChild(input);
            urlDiv.appendChild(deleteButton);
            urlsList.appendChild(urlDiv);
        });
    };
    
    addButton.addEventListener("click", () => {
        embyUrls.push("");
        chrome.storage.local.set({embyUrls: embyUrls});
        renderUrls();
    });
    
    chrome.storage.local.get({embyUrls: []}).then(({embyUrls: storedUrls}) => {
        embyUrls = storedUrls;
        renderUrls();
    });

    const indicatorCheckbox = document.getElementById("show-indicator") as HTMLInputElement;
    indicatorCheckbox.addEventListener("change", () => chrome.storage.local.set({showIndicator: indicatorCheckbox.checked}));
    chrome.storage.local.get({showIndicator: true}).then(({showIndicator}) => {
        indicatorCheckbox.checked = showIndicator;
    });

    // Handle alternative editor URL
    const alternativeEditorUrlInput = document.getElementById("alternative-editor-url") as HTMLInputElement;
    alternativeEditorUrlInput.addEventListener("change", () => {
        chrome.storage.local.set({alternativeEditorUrl: alternativeEditorUrlInput.value});
    });
    chrome.storage.local.get({alternativeEditorUrl: ""}).then(({alternativeEditorUrl}) => {
        alternativeEditorUrlInput.value = alternativeEditorUrl;
    });
});