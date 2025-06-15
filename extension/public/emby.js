const ccId = "screen-reader-descriptions-cc";
let ccElem;
let currentTracks = [];
let trackUpdateInterval = [];
let videoElem;
let currentVideoId = null;

const init = () => {
    
    ccElem = createCCElement();
    waitThenAct(".htmlVideoPlayerContainer", (container) => {
        container.appendChild(ccElem);
        console.debug("Added cc element: ", ccElem);
    });
    
    waitThenAct("video", (video) => {
        videoElem = video;
        video.addEventListener("playing", () => {
            console.log("Video playing from", video.currentTime);
            playTracksFrom(video.currentTime);
        });
        video.addEventListener("pause", () => killTracks());
        video.addEventListener("seeking", () => killTracks());
        video.addEventListener("ended", () => killTracks());

        const id = videoElem.src.match(/\/videos\/(\d+)\/original.mkv/)[1];
        if(!id){
            return;
        }

        grabData(id).then((result) => {
            if(result === null){
                return;
            }
    
            currentTracks = result.scripts[0].tracks;
        });
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

const waitThenAct = (
    selector,
    cb,
    intervalTime = 100,
    maxAttempts = 100
) => {
    const elem = document.querySelector(selector);
    if (elem) {
        cb(elem);
        return;
    }

    let valve = 0;
    const interval = setInterval(() => {
        const elem = document.querySelector(selector);
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

const grabData = async (id) => {
    const storageKey = `script-emby-info-${id}`;
    const storedData = await chrome.storage.local.get(storageKey);
    if(storageKey in storedData){
        return storedData[storageKey];
    }

    return null;
}

const playTracksFrom = (startingSecond) => {
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