document.addEventListener("DOMContentLoaded", () => {
    const addButton = document.getElementById("add-emby-url") as HTMLButtonElement;
    const urlsList = document.getElementById("emby-urls-list") as HTMLDivElement;
    
    let embyUrls: string[] = [];
    
    const renderUrls = () => {
        urlsList.innerHTML = "";
        embyUrls.forEach((url, index) => {
            const urlDiv = document.createElement("div");
            urlDiv.style.cssText = "margin: 8px 0; display: flex; gap: 8px; align-items: center;";
            
            const input = document.createElement("input");
            input.type = "text";
            input.value = url;
            input.style.cssText = "flex: 1;";
            input.addEventListener("change", () => {
                embyUrls[index] = input.value;
                chrome.storage.local.set({embyUrls: embyUrls});
            });
            
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
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
        chrome.storage.local.set({embyUrls});
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
});