let player;
let editor;
let videoId = null;
let isIframeReady = false;
let editingMode = false;
let editingRowIndex = null;

const init = () => {
    const params = new URLSearchParams(location.search);
    if(params.has("id")){
        videoId = params.get("id");
        initializeIframe();
    }

    document.getElementById("export").addEventListener("click", clickExportButton);
    document.getElementById("update").addEventListener("click", clickUpdateButton);
    document.getElementById("cancel").addEventListener("click", clickCancelButton);
    document.getElementById("submit").addEventListener("click", clickSubmitButton);
    document.getElementById("description-text").addEventListener("keydown", (event) => {
        if(event.key === "Enter" && !event.shiftKey){
            event.preventDefault();
            event.stopPropagation();
            clickSubmitButton();
        }
    });
    
    document.getElementById("timestamp-marker").addEventListener("change", (e) => {
        const converted = convertDisplayedSeconds(e.target.value);
        e.target.setAttribute("data-timestamp", converted);
        player.seekTo(converted, true);
    });

    document.getElementById("author").addEventListener("change", (e) => {
        editor.author = e.target.value;
        localStorage.setItem("author-name", editor.author);
    });
    document.getElementById("language").addEventListener("change", (e) => {
        editor.language = e.target.value;
        localStorage.setItem("author-language", editor.language);
    });

    document.getElementById("video-type").addEventListener("change", (e) => {
        editor?.updateMetadata({type: e.target.value});
    })

    Array.from(document.querySelectorAll(".metadata-block input")).forEach((elem) => {
        elem.addEventListener("change", (e) => {
            const type = elem.getAttribute("type");
            const name = elem.getAttribute("name");
            const text = e.target.value;
            editor?.updateMetadata({
                [name]: type === "number" ? Number(text) : text
            });
            localStorage.setItem(`metadata-${videoId}`, JSON.stringify(editor.metadata));
        });
    });
}

const initializeIframe = () => {
    if(!isIframeReady || !videoId){
        return;
    }
    console.debug("initializing");
    const savedTracks = JSON.parse(localStorage.getItem(`tracks-${videoId}`) ?? "[]");
    const savedAuthor = localStorage.getItem("author-name") ?? "";
    const savedLanguage = localStorage.getItem("author-language") ?? "";
    const savedMetadataString = localStorage.getItem(`metadata-${videoId}`);
    const savedMetadata = savedMetadataString ? JSON.parse(savedMetadataString) : {};
    
    editor = new Editor(videoId, {
        tracks: savedTracks,
        author: savedAuthor,
        language: savedLanguage,
        metadata: savedMetadata
    });

    editor.onTrackUpdate((tracks) => {
        localStorage.setItem(`tracks-${videoId}`, JSON.stringify(tracks));
        displayTracks(tracks);
    });

    player = new YT.Player("player", {
        height: "390",
        width: "640",
        videoId,
        playerVars: {
            fs: 0,
            playsinline: 1
        },
        events: {
            onReady: () => displayTracks(savedTracks),
            onStateChange: (event) => {
                if(event.data === YT.PlayerState.PAUSED){
                    setTimestamp(event.target.getCurrentTime())
                }
            }
        }
    });

    fillSavedMetadata(savedMetadata);
}

const padTen = (num) => {
    if(num < 10){
        return `0${num}`
    }
    return `${num}`;
}

const displaySeconds = (seconds) => {
    if(seconds < 60){
        return `0:${padTen(Math.floor(seconds))}`;
    }
    if(seconds < 3600){
        return `${Math.floor(seconds/60)}:${padTen(Math.floor(seconds % 60))}`;
    }
    return seconds;
}

const displayTranscript = () => {
    const table = document.querySelector("#transcript tbody");
    table.innerHTML = "";
    const fragment = document.createDocumentFragment();
    transcript.forEach(({timestamp, text}) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = displaySeconds(timestamp);
        const td2 = document.createElement("td");
        td2.textContent = text;
        tr.appendChild(td1);
        tr.appendChild(td2);
        fragment.appendChild(tr);
    });
    table.appendChild(fragment);
}

const downloadText = (filename, text) => {
    
    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
    element.setAttribute("download", filename);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function onYouTubeIframeAPIReady(){
    isIframeReady = true;
    initializeIframe();
}

const convertDisplayedSeconds = (display) => {
    const values = display.split(":");

    if(values.length == 2){
        return (Number(values[0]) * 60) + Number(values[1]);
    }

    return (Number(values[0]) * 3600) + (Number(values[1]) * 60) + Number(values[2])
}

const generateTrack = () => {
    const timestampElem = document.getElementById("timestamp-marker");
    const textElem = document.getElementById("description-text");

    const text = textElem.value;
    const timestamp = Number(timestampElem.getAttribute("data-timestamp"));
    
    return {timestamp, text};
}

const clickSubmitButton = () => {
    editor.addTrack(generateTrack());
    clearElements();
}

const clickExportButton = () => {
    const json = editor.generateExport();
    downloadText(`${json.source.id}.json`, JSON.stringify(json));
}

const clickUpdateButton = () => {
    editor.modifyTrack(editingRowIndex, generateTrack());
    endEditing();
    clearElements();
}

const clickCancelButton = () => {
    endEditing();
    clearElements();
}

const setTimestamp = (seconds) => {
    const input = document.getElementById("timestamp-marker");
    input.setAttribute("data-timestamp", seconds);
    input.value = displaySeconds(seconds);
}

const displayTracks = (tracks) => {
    const fragment = document.createDocumentFragment();
    tracks.forEach(({timestamp, text}, index) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = displaySeconds(timestamp);
        tr.appendChild(td1);
        const td2 = document.createElement("td");
        td2.textContent = text;
        tr.appendChild(td2);
        
        const td3 = document.createElement("td");
        const button1 = document.createElement("button");
        button1.textContent = "Edit";
        button1.addEventListener("click", () => startEditing(index, timestamp, text));
        td3.appendChild(button1);
        tr.appendChild(td3);
        
        const td4 = document.createElement("td");
        const button2 = document.createElement("button");
        button2.textContent = "Delete";
        button2.addEventListener("click", () => {
            editor.deleteTrack(index);
        });
        td4.appendChild(button2);
        tr.appendChild(td4);

        fragment.appendChild(tr);
    });

    const tbody = document.querySelector("#transcript tbody");
    tbody.innerHTML = "";
    tbody.appendChild(fragment);
}

const startEditing = (index, timestamp, text) => {
    editingMode = true;
    editingRowIndex = index;
    endEditing();
    document.querySelector(`#transcript tbody tr:nth-child(${index+1})`).setAttribute("data-isEditing", true);
    
    const timestampElem = document.getElementById("timestamp-marker");
    timestampElem.setAttribute("data-timestamp", timestamp);
    timestampElem.value = displaySeconds(timestamp);
    
    const textElem = document.getElementById("description-text");
    textElem.value = text;
}

const endEditing = () => {
    editingMode = false;
    editingRowIndex = null;
    document.querySelector("[data-isEditing]")?.removeAttribute("data-isEditing");
}

const clearElements = () => {
    const timestampElem = document.getElementById("timestamp-marker");
    timestampElem.removeAttribute("data-timestamp");
    timestampElem.value = "";
    const textElem = document.getElementById("description-text");
    textElem.value = "";
}

const fillSavedMetadata = (meta = {}) => {
    if("type" in meta){
        document.getElementById("video-type").value = meta.type;
    }

    if("season" in meta){
        document.querySelector(".metadata-block input[name='season']").value = meta.season;
    }
    if("episode" in meta){
        document.querySelector(".metadata-block input[name='episode']").value = meta.episode;
    }
    if("seriesTitle" in meta){
        document.querySelector(".metadata-block input[name='seriesTitle']").value = meta.seriesTitle;
    }
    
    if("title" in meta){
        let parent = meta.type === "television episode" ? "#television-metadata" : "other-metadata";
        document.querySelector(`${parent} input[name='title']`).value = meta.title;
    }
}

window.addEventListener("load", init);