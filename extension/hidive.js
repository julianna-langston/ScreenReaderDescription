const ccId = "screen-reader-descriptions-cc";
let ccElem;
let currentTracks = [];
let trackUpdateInterval = [];
let videoElem;
let currentVideoId = null;

const init = () => {
    // The URL that users go to will have a pathname like /video/576103
    const path = location.pathname.split("/");
    if(path[1] !== "video"){
        return;
    }

    const id = path[2];
    grabData(id).then((result) => {
        if(result === null){
            return;
        }

        currentTracks = result.scripts[0].tracks;

        if(videoElem && !videoElem.paused){
            playTracksFrom(videoElem.currentTime);
        }
    });

    ccElem = createCCElement();
    waitThenAct(".app-container", (container) => {
        container.appendChild(ccElem);
        console.debug("Added cc element: ", ccElem);
    });

    waitThenAct("video", (video) => {
        videoElem = video;
        video.addEventListener("playing", () => {
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
    const serverPath = `https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/main/transcripts/hidive/${id}.json`;
    console.debug("Grabbing data for:", {id, serverPath});

    try {
        const result = await fetch(serverPath);
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

init();
