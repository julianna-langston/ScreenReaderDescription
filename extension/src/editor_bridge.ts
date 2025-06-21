import { ScriptData } from "../../types";
import type {BridgeType, EditorReceivableMessageTypes, UpdateScriptTracks, Forwardable} from "./message_types";

let playerTabId: number | null = null;
let currentTracks: ScriptData["tracks"] = [];

// Init: Add bridge connector button
const bridgeConnectorButton = document.createElement("button");

const sendMessageToBackground = () => {
    if(playerTabId === null){
        return;
    }
    const videoMessage: UpdateScriptTracks = {
        type: "update-script-tracks",
        tracks: currentTracks
    };
    const forwardable: Forwardable = {
        type: "forward",
        tabId: playerTabId,
        message: videoMessage
    }
    console.log("Sending message", forwardable);
    chrome.runtime.sendMessage(forwardable);
}

chrome.runtime.onMessage.addListener((message: EditorReceivableMessageTypes) => {
    console.debug("[Screen Reader Description]: Received message from background:", message);
    switch(message.type){
        case "editor-bridge": {
            bridgeConnectorButton.textContent = "Bridged";
            playerTabId = message.playerTabId;
            sendMessageToBackground();
            break;
        }
        case "update-script-tracks": {
            document.dispatchEvent(
                new CustomEvent("ScreenReaderDescription-Track-Update-From-Player", {
                    detail: {
                        tracks: message.tracks
                    }
                })
            );
            break;
        }
    }
})

document.querySelector("#editor-top").prepend(bridgeConnectorButton);
bridgeConnectorButton.textContent = "Bridge for Live Editing";
bridgeConnectorButton.addEventListener("click", () => {
    const urlInput = document.getElementById("url") as HTMLInputElement;
    const bridgeInfo: BridgeType = {
        type: "bridge",
        url: urlInput.value
    };
    chrome.runtime.sendMessage(bridgeInfo);
});

document.addEventListener("ScreenReaderDescription-Track-Update", (e: CustomEvent) => {
    currentTracks = e.detail.tracks as ScriptData["tracks"];
    sendMessageToBackground();
});