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
    const {alternativeEditorUrl} = await chrome.storage.local.get<{alternativeEditorUrl: string}>({alternativeEditorUrl: ""});
    const registeredScripts = await chrome.scripting.getRegisteredContentScripts();
    const scriptExists = registeredScripts.some(script => script.id === "alternative-editor");
    const isUrlValid = alternativeEditorUrl && alternativeEditorUrl.trim() !== "" && alternativeEditorUrl.includes("://");

    if(scriptExists && !isUrlValid){
        await chrome.scripting.unregisterContentScripts({ids: ["alternative-editor"]});
        return;
    }

    if(scriptExists && isUrlValid){
        await chrome.scripting.updateContentScripts([{
            id: "alternative-editor",
            matches: [alternativeEditorUrl]
        }]);
        return
    }

    if(!scriptExists && isUrlValid){
        await chrome.scripting.registerContentScripts([{
            id: "alternative-editor",
            js: ["editor_bridge.js"],
            matches: [alternativeEditorUrl],
        }]);
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