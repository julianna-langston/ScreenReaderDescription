import { ScriptData } from "../../types";

let currentTracks: ScriptData["tracks"] = [];
let lastTouchedTimestamp = -1;

const createIndicator = () => {
    const indicator = document.createElement("div");
    indicator.textContent = "SRD)))";
    indicator.style.cssText = "color: red; font-weight: bold; padding: 4px; border: 1px solid red; border-radius: 4px; background-color: rgba(255, 0, 0, 0.1); width: fit-content; height:20px;";
    document.body.appendChild(indicator);
    return indicator;
};

createIndicator();

const sendMessageToBackground = () => {
    lastTouchedTimestamp = Date.now();
    chrome.storage.local.set({ trackUpdates: { tracks: currentTracks, lastTouched: lastTouchedTimestamp, timestamp: lastTouchedTimestamp } });
}

chrome.storage.local.onChanged.addListener((changes) => {
    console.debug("[Screen Reader Description]: Local storage changed:", changes);
    // Handle track updates from player
    if (changes.trackUpdates) {
        if(changes.lastTouchedTimestamp && changes.lastTouchedTimestamp.newValue === lastTouchedTimestamp){
            return;
        }
        const trackData = changes.trackUpdates.newValue;
        if (trackData) {
            document.dispatchEvent(
                new CustomEvent("ScreenReaderDescription-Track-Update-From-Player", {
                    detail: {
                        tracks: trackData.tracks,
                        lastTouched: trackData.lastTouched
                    }
                })
            );
        }
    }
    
        // Handle ID announcements from player
    if (changes.currentlyEditingId) {
        const idData = changes.currentlyEditingId.newValue;
        if (idData) {
            document.dispatchEvent(
                new CustomEvent("ScreenReaderDescription-announce-id", {
                    detail: {
                        id: idData.id
                    }
                })
            );
        }
    }
    
    // Handle embyUrl changes
    if (changes.embyUrl) {
        console.log("Emby URL updated:", changes.embyUrl.newValue);
        // Handle emby URL changes if needed
    }
});

document.addEventListener("ScreenReaderDescription-Track-Update", (e: CustomEvent) => {
    currentTracks = e.detail.tracks as ScriptData["tracks"];
    sendMessageToBackground();
});

document.addEventListener("ScreenReaderDescription-video-id-update", (e: CustomEvent) => {
    chrome.storage.local.set({ currentlyEditingId: { id: e.detail.id, timestamp: Date.now() } });
});
