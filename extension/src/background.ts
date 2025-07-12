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

void updateForEmby();

chrome.storage.local.onChanged.addListener((changes) => {
    if("embyUrl" in changes){
        void updateForEmby();
    }
});