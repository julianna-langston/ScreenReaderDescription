import { ScriptData, ScriptInfo } from "../../types";
import { Forwardable, PlayerReceivableMessageTypes, UpdateScriptTracks } from "./message_types";
import { createCCElement, createStyleElement, waitThenAct, grabScripts, createTrackEditorDialog } from "./utils";

type DomainMainCallbacks = {
    teardown: () => void;
    setup: (id: string, errorCallback?: () => void) => void;
}
type DomainRegistrationParams = {
    generateServerPath: (id: string) => string;
    style: string;
    videoSelector: string;
    platformId: ScriptInfo["source"]["domain"];
    ccContainerSelector: string;
    main: ({teardown, setup}: DomainMainCallbacks) => void;

    /** Editing **/
    editorListenerContainerSelector?: string;
}

export class SRDManager {
    private trackUpdateInterval: NodeJS.Timeout[] = [];
    private videoElement: HTMLVideoElement | null = null;
    private currentScript: ScriptInfo | null = null;
    private _currentTracks: ScriptData["tracks"] = [];
    private currentKey: string | null = null;
    private ccElement: HTMLDivElement;

    /** Bridging **/
    private bridgedTabId: number | null = null;

    /** Editing **/
    private editMode = false;
    private editingMarker: number | null = null;
    private lastPlayedTimestamp = -1;
    private trackEditorDialog: HTMLDialogElement;
    
    constructor(private params: DomainRegistrationParams){
        this.ccElement = createCCElement();
        
        this.trackEditorDialog = createTrackEditorDialog(() => {
            const trackIndex = Number(this.trackEditorDialog.getAttribute("data-trackIndex"));
            const trackTimestamp = Number(this.trackEditorDialog.getAttribute("data-timestamp"));
            const trackEditorInput = this.trackEditorDialog.querySelector("input");
            if(trackIndex >= 0){
                this.currentTracks[trackIndex].text = trackEditorInput.value;
            }else{
                const indexToInsertAfter = this.currentTracks.findLastIndex(({timestamp}) => timestamp < trackTimestamp);
                this.currentTracks = this.currentTracks.toSpliced(indexToInsertAfter + 1, 0, {
                    text: trackEditorInput.value,
                    timestamp: trackTimestamp
                });
                this.lastPlayedTimestamp = trackTimestamp;
            }
            trackEditorInput.value = "";
            this.trackEditorDialog.close();
            this.playTranscriptFrom(trackTimestamp - 3);
            this.editingMarker = null;
        });

        // TODO: Set up indicator element

        // TODO: Setup editor messages
        console.debug("Wiring up for messaging...");
        chrome.runtime.onMessage.addListener((message: PlayerReceivableMessageTypes) => {
            switch(message.type){
                case "editor-bridge": {
                    this.bridgedTabId = message.editorTabId;
                    break;
                }
                case "update-script-tracks": {
                    console.debug("Updating tracks...");
                    this.currentTracks = message.tracks;
                    break;
                }
            }
        })

        // Setup page
        document.head.appendChild(
            createStyleElement(this.params.style)
        );
        waitThenAct<HTMLDivElement>(this.params.ccContainerSelector, (container) => {
            console.debug("CC Container located: ", container);
            container.appendChild(this.ccElement);
        });

        // Wireup callbacks
        this.params.main({
            teardown: () => void this.teardown(),
            setup: (id, cb) => void this.setup(id, cb),
        })
    }

    get lastPlayedTrackIndex(){
        return this.currentTracks.findIndex(({timestamp}) => timestamp === this.lastPlayedTimestamp);
    }

    private async setup(videoId: string, errorCallback?: () => void){
        console.debug("[ScreenReaderDescription] - Setting up for", videoId);
        this.currentKey = `script-${this.params.platformId}-info-${videoId}`
        const serverPath = this.params.generateServerPath(videoId);
        this.currentScript = await grabScripts(this.currentKey, serverPath);
        
        waitThenAct<HTMLVideoElement>(this.params.videoSelector, (video) => {
            this.videoElement = video;
            this.wireListenersToVideo();
        });
        if(this.params.editorListenerContainerSelector){
            waitThenAct<HTMLDivElement>(this.params.editorListenerContainerSelector, (container) => {
                if(!container.hasAttribute("role")){
                    container.setAttribute("role", "application");
                }
                container.addEventListener("keydown", (e) => {
                    this.manageEditingMode(e);
                });
                container.appendChild(this.trackEditorDialog);
            });
        }

        console.debug("[ScreenReaderDescription] - Grabbed script", this.currentScript);
        if (!this.currentScript) {
            errorCallback?.();
            return;
        }
        this.currentTracks = this.currentScript.scripts[0].tracks;
        if (!this.videoElement.paused) {
            this.playTranscriptFrom(this.videoElement.currentTime);
        }
    }

    get currentTracks() {
        return this._currentTracks;
    }
    set currentTracks(tracks) {
        if(JSON.stringify(this._currentTracks) === JSON.stringify(tracks)){
            return;
        }
        this._currentTracks = tracks;
        this.killTranscript();
        if (this.videoElement && !this.videoElement?.paused) {
            this.playTranscriptFrom(this.videoElement.currentTime);
        }
        console.log("Current tracks updated. Bridged?", this.bridgedTabId);
        if(this.bridgedTabId !== null){
            const updateMessage: UpdateScriptTracks = {
                type: "update-script-tracks",
                tracks: this._currentTracks
            };
            const forwardable: Forwardable = {
                type: "forward",
                tabId: this.bridgedTabId,
                message: updateMessage
            }
            console.log("Sending message", forwardable);
            chrome.runtime.sendMessage(forwardable)
        }
    }
    teardown() {
        this.currentKey = null;
        this.currentScript = null;
        this.currentTracks = [];
        this.ccElement.innerHTML = "";
    }
    playTranscriptFrom(startingSecond: number) {
        this.killTranscript();
        const trackToGo = this.currentTracks.filter(({ timestamp }) => timestamp >= startingSecond);
        this.trackUpdateInterval = trackToGo.map(({ text, timestamp }) => setTimeout(() => {
            this.lastPlayedTimestamp = timestamp;
            console.debug("AD Message: ", text, timestamp);
            const div = document.createElement("div");
            div.textContent = text;
            this.ccElement.prepend(div);
        }, (timestamp - startingSecond) * 1000));
    }
    killTranscript() {
        this.trackUpdateInterval.forEach((t) => {
            clearTimeout(t);
        });
        this.trackUpdateInterval = [];
    }
    wireListenersToVideo() {
        const video = this.videoElement;
        if (!video.paused) {
            this.playTranscriptFrom(video.currentTime);
        }
        video.addEventListener("playing", () => {
            this.playTranscriptFrom(video.currentTime);
        });
        video.addEventListener("pause", () => {
            this.killTranscript();
        });
        video.addEventListener("seeking", () => this.killTranscript());
        video.addEventListener("waiting", () => this.killTranscript());
        video.addEventListener("emptied", () => this.killTranscript());

        console.debug("[ScreenReaderDescriptions] - All listeners wired up");
    }
    manageEditingMode(e: KeyboardEvent) {
        if(e.key === "r"){
            this.editMode = !this.editMode;
            console.log("Editing mode: ", this.editMode ? "on" : "off");
            return;
        }
        if(!this.editMode){
            return;
        }
        switch(e.key){
            case "e": {
                // Edit last-played track
                e.preventDefault();
                e.stopPropagation();
                console.log("Edit track", this.lastPlayedTrackIndex);
                if(this.lastPlayedTrackIndex === -1){
                    return;
                }
                this.videoElement.pause();
                this.trackEditorDialog.setAttribute("data-trackIndex", `${this.lastPlayedTrackIndex}`);
                this.trackEditorDialog.setAttribute("data-timestamp", `${this.currentTracks[this.lastPlayedTrackIndex].timestamp}`);
                const input = this.trackEditorDialog.querySelector("input");
                input.value = this.currentTracks[this.lastPlayedTrackIndex]?.text ?? "";
                this.trackEditorDialog.showModal();
                break;
            }
            case "f": {
                // Add new track
                this.videoElement.pause();
                this.trackEditorDialog.setAttribute("data-trackIndex", "-1");
                this.trackEditorDialog.setAttribute("data-timestamp", (this.editingMarker ?? this.videoElement.currentTime).toFixed(1));
                this.trackEditorDialog.showModal();
                e.preventDefault();
                e.stopPropagation();
                break;
            }
            case "d" : {
                // Mark
                this.editingMarker = this.videoElement.currentTime;
                break;
            }
            case "a": {
                let delta = 5;
                if(e.altKey){
                    delta = 1;
                }
                // Jump back
                this.videoElement.currentTime = this.videoElement.currentTime - delta;
                break;
            }
            case "s": {
                let delta = 5;
                if(e.altKey){
                    delta = 1;
                }
                // Jump forward
                this.videoElement.currentTime = this.videoElement.currentTime + delta;
                break;
            }
            case "q": {
                // Previous text
                const previousTrack = this.currentTracks[this.lastPlayedTrackIndex - 1];
                if(!previousTrack){
                    return;
                }
                this.videoElement.currentTime = previousTrack.timestamp;
                this.videoElement.play();
                console.log("previous text", this.lastPlayedTrackIndex, this.currentTracks);
                break;
            }
            case "w": {
                // Next text
                const nextTrack = this.currentTracks[this.lastPlayedTrackIndex + 1];
                if(!nextTrack){
                    return;
                }
                this.videoElement.currentTime = nextTrack.timestamp;
                this.videoElement.play();
                console.log("next text", this.lastPlayedTrackIndex, this.currentTracks);
                break;
            }
            case "x": {
                // Move last-played track back
                if(this.lastPlayedTrackIndex < 0){
                    return;
                }
                let delta = 1;
                if(e.altKey){
                    delta = .1;
                }
                this.currentTracks[this.lastPlayedTrackIndex].timestamp -= delta;
                console.log("move back 1s", this.lastPlayedTrackIndex, this.currentTracks);
                break;
            }
            case "c": {
                // Move last-played track forward
                if(this.lastPlayedTrackIndex < 0){
                    return;
                }
                let delta = 1;
                if(e.altKey){
                    delta = .1;
                }
                this.currentTracks[this.lastPlayedTrackIndex].timestamp += delta;
                break;
            }
            case "h": {
                console.log("show help");
                break;
            }
        }
    }
}
