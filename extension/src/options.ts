document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("emby-url") as HTMLInputElement;
    input.addEventListener("change", () => chrome.storage.sync.set({embyUrl: input.value}));
    chrome.storage.sync.get({embyUrl: ""}).then(({embyUrl}) => {
        input.value = embyUrl;
    })
});