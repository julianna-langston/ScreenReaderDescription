import { ScriptData, ScriptInfo } from "../../types";

const ccId = "screen-reader-descriptions-cc";
let ccElem: HTMLDivElement;
let currentTracks: ScriptData["tracks"] = [];
let trackUpdateInterval: NodeJS.Timeout[] = [];
let videoElem: HTMLVideoElement;
let currentVideoId: string | null = null;

const init = () => {
    // The URL that users go to will have a pathname like /watch/G50UZ0947/haga-makoto
    // The iframe where the video actually lives will have a pathname like /vilos-v2/web/vilos/player.html
    // This script gets injected onto both, so we need to filter out the /watch/* portion

    const folders = location.pathname.split("/");
    if(folders[1] !== "vilos-v2"){
        return;
    }
    
    console.debug("Initializing (iframe)");
    
    window.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);
        console.debug("Received message: ", data);
        if(data.method !== "loadConfig" && data.method !== "extendConfig"){
            return;
        }

        const id = data.value?.media?.metadata?.id;
        if(!id){
            return;
        }

        if(currentVideoId === id){
            return;
        }

        currentVideoId = id;
        
        grabData(id).then((result: ScriptInfo) => {
            if(result === null){
                return;
            }

            currentTracks = result.scripts[0].tracks;
        });
    });
    
    ccElem = createCCElement();
    waitThenAct("#velocity-player-package", (container: HTMLDivElement) => {
        container.appendChild(ccElem);
        console.debug("Added cc element: ", ccElem);
    });

    waitThenAct<HTMLVideoElement>("video", (video) => {
        videoElem = video;
        video.addEventListener("playing", () => {
            console.log("Video playing from", video.currentTime);
            playTracksFrom(video.currentTime);
        });
        video.addEventListener("pause", () => killTracks());
        video.addEventListener("seeking", () => killTracks());
        video.addEventListener("ended", () => killTracks());
    })
}

const createCCElement = () => {
    const cc = document.createElement("div");
    cc.setAttribute("role", "status");
    cc.setAttribute("aria-live", "assertive");
    cc.setAttribute("aria-atomic", "true");
    cc.setAttribute("aria-relevant", "additions text");
    cc.id = ccId;
    return cc;
};

const waitThenAct = <T>(
    selector: string,
    cb: (element: T) => void,
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

const grabData = async (id: string) => {
    const storageKey = `script-crunchyroll-info-${id}`;
    const storedData = await chrome.storage.local.get(storageKey);
    if(storageKey in storedData){
        return storedData[storageKey];
    }

    const serverPath = `https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/main/transcripts/crunchyroll/${id}.json`;
    console.debug("Grabbing data for:", {id, serverPath});

    try {
        const result = await fetch(serverPath);
        return (await result.json());
    } catch (err) {
        console.warn("Received error while fetching/processing json from server: ", err);
    }
    return null;
}

const playTracksFrom = (startingSecond: number) => {
    console.debug("Playing tracks from", startingSecond);
    killTracks();
    const tracksToGo = currentTracks.filter(({timestamp}) => timestamp >= startingSecond);

    trackUpdateInterval = tracksToGo.map(({text, timestamp}) => setTimeout(
        () => {
            ccElem.innerHTML = "";
            console.debug("AD Message: ", text, timestamp);
            const div = document.createElement("div");
            div.textContent = text;
            ccElem.prepend(div);
        },
        (timestamp - startingSecond) * 1000
    ));
}

const killTracks = () => {
    trackUpdateInterval.forEach((t) => clearTimeout(t));
    trackUpdateInterval = [];
}

init();