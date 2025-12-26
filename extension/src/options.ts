// Default keyboard shortcuts
const DEFAULT_SHORTCUTS = {
    toggleEditMode: "r",
    displayTranscript: "t",
    editTrack: "e",
    addTrack: "f",
    markPosition: "d",
    jumpBack: "a",
    jumpBackFine: "a", // Alt+a
    jumpForward: "s",
    jumpForwardFine: "s", // Alt+s
    previousTrack: "q",
    nextTrack: "w",
    moveTrackBack: "x",
    moveTrackBackFine: "x", // Shift+x
    moveTrackForward: "c",
    moveTrackForwardFine: "c", // Shift+c
    showHelp: "h",
    editMetadata: "m",
    openNotes: "n"
};

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
                chrome.storage.local.set({embyUrls});
            });
            
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-button";
            deleteButton.addEventListener("click", () => {
                embyUrls.splice(index, 1);
                chrome.storage.local.set({embyUrls});
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

    // Handle alternative editor URL
    const alternativeEditorUrlInput = document.getElementById("alternative-editor-url") as HTMLInputElement;
    alternativeEditorUrlInput.addEventListener("change", () => {
        chrome.storage.local.set({alternativeEditorUrl: alternativeEditorUrlInput.value});
    });
    chrome.storage.local.get({alternativeEditorUrl: ""}).then(({alternativeEditorUrl}) => {
        alternativeEditorUrlInput.value = alternativeEditorUrl;
    });

    // Handle keyboard shortcuts
    const loadShortcuts = async () => {
        const {keyboardShortcuts} = await chrome.storage.local.get({keyboardShortcuts: DEFAULT_SHORTCUTS});
        const shortcutInputs = document.querySelectorAll('.shortcut-input') as NodeListOf<HTMLInputElement>;
        
        shortcutInputs.forEach(input => {
            const action = input.getAttribute('data-action');
            if (action && keyboardShortcuts[action]) {
                input.value = keyboardShortcuts[action].toUpperCase();
            }
        });
    };

    const saveShortcuts = async () => {
        const shortcutInputs = document.querySelectorAll('.shortcut-input') as NodeListOf<HTMLInputElement>;
        const shortcuts: Record<string, string> = {};
        
        shortcutInputs.forEach(input => {
            const action = input.getAttribute('data-action');
            if (action && input.value) {
                shortcuts[action] = input.value.toLowerCase();
            }
        });
        
        await chrome.storage.local.set({keyboardShortcuts: shortcuts});
    };

    // Load shortcuts on page load
    loadShortcuts();

    // Save shortcuts when inputs change
    const shortcutInputs = document.querySelectorAll('.shortcut-input') as NodeListOf<HTMLInputElement>;
    shortcutInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            // Only allow single character input
            if (target.value.length > 1) {
                target.value = target.value.slice(-1);
            }
            // Convert to uppercase for display
            target.value = target.value.toUpperCase();
        });

        input.addEventListener('blur', saveShortcuts);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveShortcuts();
                (e.target as HTMLInputElement).blur();
            }
        });
    });

    // Handle reset to defaults
    const resetButton = document.getElementById("reset-shortcuts") as HTMLButtonElement;
    resetButton.addEventListener("click", () => {
        chrome.storage.local.set({keyboardShortcuts: DEFAULT_SHORTCUTS});
        loadShortcuts();
    });
});