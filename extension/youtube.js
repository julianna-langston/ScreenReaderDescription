const ccId = "screen-reader-descriptions-cc";
let ccElem;
let currentTracks = [];
let trackUpdateInterval = [];
let videoElem;
let currentVideoId = null;

const ccContainerSelector = "#below";
const videoSelector = "#content video";

const init = () => {
    document.head.appendChild(createStyleElement());

    // The URL that users go to will have a pathname like /watch?v=.....
    if(location.pathname === "/watch"){
        currentVideoId = new URLSearchParams(location.search).get("v");
        setup();
    }

    document.addEventListener("yt-navigate-start", (e) => {
        tearDown();

        if(e.detail.pageType !== "watch"){
            return;
        }

        currentVideoId = e.detail.endpoint.watchEndpoint.videoId;
        setup();
    });
}

const setup = () => {
    grabData(currentVideoId).then((result) => {
        console.log("Grabbed data: ", result);
        if(result === null){
            return;
        }
    
        currentTracks = result.scripts[0].tracks;
        if(videoElem?.paused === false){
            playTracksFrom(videoElem.currentTime);
        }
    });
    ccElem = createCCElement();
    waitThenAct(ccContainerSelector, (container) => {
        container.insertBefore(ccElem, container.childNodes[0] ?? null);
        console.debug("Added cc element: ", ccElem);
    });
    waitThenAct(videoSelector, (video) => {
        videoElem = video;
        if(!video.paused){
            playTracksFrom(video.currentTime);
        }
        video.addEventListener("playing", () => {
            console.debug("Video playing from", video.currentTime);
            playTracksFrom(video.currentTime);
        });
        video.addEventListener("pause", () => killTracks());
        video.addEventListener("seeking", () => killTracks());
        video.addEventListener("ended", () => killTracks());
        console.debug("Wired up video");
    });
}

const tearDown = () => {
    killTracks();
    currentTracks = [];
    videoElem = null;
    currentVideoId = null;
    ccElem.remove();
    ccElem = null;
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
    const serverPath = `https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/main/transcripts/${id}.json`;
    console.debug("Grabbing data for:", {id, serverPath});

    try {
        const result = await fetch(serverPath);
        if(result.status === 404){
            console.debug(`YouTube video ${id} does not have a description.`);
            return null;
        }
        return (await result.json());
    } catch (err) {
        console.warn("Received error while fetching/processing json from server: ", err);
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

const createStyleElement = () => {
    const style = document.createElement("style");
    style.textContent = `
#${ccId} {
    background: var(--yt-spec-badge-chip-background);
    margin-top: 12px;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 1.4rem;
    line-height: 2rem;
    padding: 12px;
    border-radius: 12px;

    &:not(:has(:first-child)){
        display: none;
    }
}
`
    return style;
}

init();