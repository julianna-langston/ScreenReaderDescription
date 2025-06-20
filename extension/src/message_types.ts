import { ScriptData } from "../../types";

export type BridgeType = {
    type: "bridge";
    url: string;
}

export type ForwardableToPlayer = {
    type: "forward";
    tabId: number;
    message: PlayerReceivableMessageTypes;
}

export type BackgroundReceivableMessageTypes = BridgeType | ForwardableToPlayer;


export type EditorHandshake = {
    type: "editor-bridge",
    editorTabId: number;
}

export type UpdateScriptTracks = {
    type: "update-script-tracks",
    tracks: ScriptData["tracks"]
}

export type PlayerReceivableMessageTypes = EditorHandshake | UpdateScriptTracks;


export type VideoHandshake = {
    type: "editor-bridge",
    playerTabId: number;
}

export type EditorReceivableMessageTypes = VideoHandshake;