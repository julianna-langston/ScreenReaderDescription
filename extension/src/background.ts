import type { BackgroundReceivableMessageTypes, EditorHandshake, PlayerHandshake } from "./message_types";

const sendHandshake = (editorTabId: number, playerTabId: number) => {
    const sendToPlayer: EditorHandshake = {
        type: "editor-bridge",
        editorTabId
    }
    void chrome.tabs.sendMessage(playerTabId, sendToPlayer);
    const sendToEditor: PlayerHandshake = {
        type: "editor-bridge",
        playerTabId
    }
    void chrome.tabs.sendMessage(editorTabId, sendToEditor);
}

chrome.runtime.onMessage.addListener((message: BackgroundReceivableMessageTypes, sender) => {
    switch(message.type){
        case "bridge": {
            chrome.tabs.query({url: message.url}, (tabs) => {
                if(tabs.length > 0){
                    sendHandshake(sender.tab.id, tabs[0].id);
                }else{
                    chrome.tabs.create({
                        active: true,
                        url: message.url
                    }, (newTab) => {
                        sendHandshake(sender.tab.id, newTab.id);
                    });
                }
            });
            break;
        }
        case "forward": {
            console.debug("Forwarding message...", message, "From: ", sender);
            chrome.tabs.sendMessage(message.tabId, message.message)
            break;
        }
    }
});