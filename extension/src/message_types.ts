import { ScriptData } from "../../types";

/**
 * 1. Editor initiates Handshake: 
 *   - Editor (BridgeType) -> Background
 *   - Background (EditorHandshake) -> Player
 *   - Background (PlayerHandshake) -> Editor
 * 2. Editor modifies track:
 *   - Editor (Forwardable(UpdateScriptTracks)) -> Background (UpdateScriptTracks) -> Player
 * 3. Player modifies track:
 *   - Player (Forwardable(UpdateScriptTracks)) -> Background (UpdateScriptTracks) -> Editor
 */

export type UpdateScriptTracks = {
    type: "update-script-tracks";
    tracks: ScriptData["tracks"];
    lastTouched: number;
}

export type EditorHandshake = {
    type: "editor-bridge";
    editorTabId: number;
}

export type PlayerReceivableMessageTypes = UpdateScriptTracks | EditorHandshake;

export type PlayerHandshake = {
    type: "editor-bridge";
    playerTabId: number;
}

export type PlayerIdAnnounce = {
    type: "id-announce";
    id: string;
}

export type EditorReceivableMessageTypes = UpdateScriptTracks | PlayerHandshake | PlayerIdAnnounce;

export type BridgeType = {
    type: "bridge";
    url: string;
}

export type Forwardable = {
    type: "forward";
    tabId: number;
    message: PlayerReceivableMessageTypes | EditorReceivableMessageTypes;
}

export type BackgroundReceivableMessageTypes = BridgeType | Forwardable;