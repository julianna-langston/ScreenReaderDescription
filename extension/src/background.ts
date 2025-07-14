const updateForEmby = async () => {
    const info = await chrome.scripting?.getRegisteredContentScripts();
    const hasRegisteredContentScripts = info.length > 0;
    const {embyUrl} = await chrome.storage.local.get({embyUrl: ""});

    if(!embyUrl){
        return;
    }

    if(hasRegisteredContentScripts){
        await chrome.scripting.updateContentScripts([{
            id: "emby-url",
            matches: [embyUrl]
        }]);
    }else{
        await chrome.scripting.registerContentScripts([{
            id: "emby-url",
            js: ["emby.js"],
            matches:["https://emby.firethestars.com/*"],
        }]);
    }
};

const updateForAlternativeEditor = async () => {
    const {alternativeEditorUrl} = await chrome.storage.local.get({alternativeEditorUrl: ""});
    
    if (!alternativeEditorUrl) {
        // Remove the content script if URL is empty
        try {
            await chrome.scripting.unregisterContentScripts({ids: ["alternative-editor"]});
        } catch (e) {
            // Script might not exist, ignore error
        }
        return;
    }

    try {
        await chrome.scripting.registerContentScripts([{
            id: "alternative-editor",
            js: ["editor_bridge.js"],
            matches: [alternativeEditorUrl]
        }]);
    } catch (e) {
        // If script already exists, update it
        try {
            await chrome.scripting.updateContentScripts([{
                id: "alternative-editor",
                matches: [alternativeEditorUrl]
            }]);
        } catch (updateError) {
            console.error("Failed to update alternative editor content script:", updateError);
        }
    }
};

void updateForEmby();
void updateForAlternativeEditor();

chrome.storage.local.onChanged.addListener((changes) => {
    if("embyUrl" in changes){
        void updateForEmby();
    }
    if("alternativeEditorUrl" in changes){
        void updateForAlternativeEditor();
    }
});