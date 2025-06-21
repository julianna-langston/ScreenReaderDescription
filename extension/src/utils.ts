import type { ScriptInfo } from "../../types";
import {ccId} from "./constants";

export const createCCElement = () => {
    const cc = document.createElement("div");
    cc.setAttribute("role", "status");
    cc.setAttribute("aria-live", "assertive");
    cc.setAttribute("aria-atomic", "true");
    cc.setAttribute("aria-relevant", "additions text");
    cc.id = ccId;
    return cc;
};

export const createTrackEditorDialog = (submitCallback: () => void) => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("data-trackIndex", "-1");
    dialog.setAttribute("data-timestamp", "-1");
    const trackEditorInput = document.createElement("input");
    const trackSubmitButton = document.createElement("button");
    trackSubmitButton.textContent = "Submit";
    trackSubmitButton.style.display = "block";
    trackSubmitButton.addEventListener("click", submitCallback);
    trackEditorInput.addEventListener("keydown", (e) => {
        if(e.key === "Enter"){
            submitCallback();
        }
        e.stopPropagation()
    });
    dialog.appendChild(trackEditorInput);
    dialog.appendChild(trackSubmitButton);
    return dialog;
}

export const createStyleElement = (css: string) => {
    const style = document.createElement("style");
    style.textContent = css;
    return style;
};

export const waitThenAct = <T>(
    selector: string, 
    cb: (elem: T) => void, 
    intervalTime = 100, 
    maxAttempts = 100
) => {
    const elem = document.querySelector(selector) as T;
    if (elem) {
        cb(elem);
        return;
    }
    let valve = 0;
    const interval = setInterval(() => {
        const elem = document.querySelector(selector) as T;
        if (elem) {
            clearInterval(interval);
            cb(elem);
            return;
        }
        valve--;
        if (valve > maxAttempts) {
            clearInterval(valve);
            console.warn("Timed out: Could not find ", selector);
        }
    }, intervalTime);
};

export const grabScripts = async (storageKey: string, serverPath: string): Promise<ScriptInfo | null> => {
    console.debug("[ScreenReaderDescription] Getting from storage...", storageKey);
    const saved = (await chrome.storage.local.get([storageKey]))[storageKey];
    if (saved) {
        return saved;
    }
    console.debug("[ScreenReaderDescription] Getting from server...", serverPath);
    try {
        const result = await fetch(serverPath);
        return (await result.json());
    }
    catch (err) {
        console.warn("Received error while fetching/processing json from server: ", err);
        return null;
    }
};