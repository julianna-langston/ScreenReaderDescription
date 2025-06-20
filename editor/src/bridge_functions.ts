import { ScriptData } from "./types";

export const sendMessageUpdateTracks = (tracks: ScriptData["tracks"]) => {
    document.dispatchEvent(new CustomEvent("ScreenReaderDescription-Track-Update", {detail: {tracks}}));
}

export const sendMessageUpdatePlayback = (playPause: boolean, currentTime: number) => {
    document.dispatchEvent(new CustomEvent("ScreenReaderDescription-Playback-Update", {detail: {playPause, currentTime}}));
}