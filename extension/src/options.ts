document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("emby-url") as HTMLInputElement;
    input.addEventListener("change", () => chrome.storage.local.set({embyUrl: input.value}));
    chrome.storage.local.get({embyUrl: ""}).then(({embyUrl}) => {
        input.value = embyUrl;
    })
});