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

    dialog.addEventListener("close", () => {
        dialog.setAttribute("data-isEditing", "false");
        trackEditorInput.value = "";
    });
    return dialog;
}

export const createTrackDisplayDialog = () => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `<button>Close</button>
    <table>
        <thead>
            <tr>
                <th scole="col">Timestamp</th>
                <th scope="col">Text</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>`;
    dialog.querySelector("button").addEventListener("click", () => {
        dialog.close();
    });
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
        console.log("Received error while fetching/processing json from server: ", err);
        return null;
    }
};

const padNumbers = (num: number, padCount: number, text = "0") => {
    const numberLength = String(num).length;
    const paddingNeeded = padCount - numberLength;
    if (paddingNeeded <= 0) {
        return String(num);
    }
    return Array(paddingNeeded).fill(text).join("") + num;
}
export const renderTimestamp = (seconds: number) => `${padNumbers(Math.floor(seconds / 60), 2)}:${padNumbers(Math.floor(seconds % 60), 2)}`;

const padNumbersSimple = (num: number) => {
    if (num < 10) {
        return `0${num}`;
    }
    return `${num}`;
};

export const displayTimestamp = (num: number) => {
    const seconds = (num % 60);
    const minutes = Math.floor(num / 60);
    return `${padNumbersSimple(minutes)}:${padNumbersSimple(+seconds.toFixed(1))}`.match(/(\d{2}:\d{2}\.?[1-9]*)/)?.[1] ?? "00:00";
};

export const generateExportFilename = (metadata: {
    type: string;
    title: string;
    seriesTitle?: string;
    season?: number;
    episode?: number;
    creator?: string;
}) => {
    const sanitizeTitle = (title: string) => {
        return title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    };

    const padNumber = (num: number) => {
        return num.toString().padStart(2, '0');
    };

    switch (metadata.type) {
        case "television episode": {
            const title = sanitizeTitle(metadata.title);
            const season = metadata.season !== undefined ? padNumber(metadata.season) : '';
            const episode = metadata.episode !== undefined ? padNumber(metadata.episode) : '';
            
            if (season && episode) {
                return `S${season}E${episode} - ${title}.json`;
            } else if (episode) {
                return `E${episode} - ${title}.json`;
            } else {
                return `${title}.json`;
            }
        }
        default: {
            return `${sanitizeTitle(metadata.title)}.json`;
        }
    }
};

