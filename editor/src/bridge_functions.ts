import { ScriptData } from "./types";

export const sendMessageUpdateTracks = (tracks: ScriptData["tracks"]) => {
    document.dispatchEvent(new CustomEvent("ScreenReaderDescription-Track-Update", {detail: {tracks}}));
}
