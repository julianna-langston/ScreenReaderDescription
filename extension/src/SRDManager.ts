import { ScriptData, ScriptInfo } from "../../types";
import { PlayerReceivableMessageTypes } from "./message_types";
import { createCCElement, createStyleElement, waitThenAct, grabScripts } from "./utils";

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
}

export class SRDManager {
    private trackUpdateInterval: NodeJS.Timeout[] = [];
    private videoElement: HTMLVideoElement | null = null;
    private currentScript: ScriptInfo | null = null;
    private _currentTracks: ScriptData["tracks"] = [];
    private currentKey: string | null = null;
    private ccElement: HTMLDivElement;
    
    constructor(private params: DomainRegistrationParams){
        this.ccElement = createCCElement();

        // TODO: Set up indicator element

        // TODO: Setup editor messages
        console.debug("Wiring up for messaging...");
        chrome.runtime.onMessage.addListener((message: PlayerReceivableMessageTypes) => {
            switch(message.type){
                case "editor-bridge": {
                    console.log("UNHANDLED: ", message);
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

    private async setup(videoId: string, errorCallback?: () => void){
        console.debug("[ScreenReaderDescription] - Setting up for", videoId);
        this.currentKey = `script-${this.params.platformId}-info-${videoId}`
        const serverPath = this.params.generateServerPath(videoId);
        this.currentScript = await grabScripts(this.currentKey, serverPath);
        
        waitThenAct<HTMLVideoElement>(this.params.videoSelector, (video) => {
            this.videoElement = video;
            this.wireListenersToVideo();
        });

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
        this._currentTracks = tracks;
        this.killTranscript();
        if (this.videoElement && !this.videoElement?.paused) {
            this.playTranscriptFrom(this.videoElement.currentTime);
        }
    }
    teardown() {
        this.currentKey = null;
        this.currentScript = null;
        this.currentTracks = [];
        this.ccElement.innerHTML = "";
    }
    playTranscriptFrom(startingSecond) {
        this.killTranscript();
        const trackToGo = this.currentTracks.filter(({ timestamp }) => timestamp >= startingSecond);
        this.trackUpdateInterval = trackToGo.map(({ text, timestamp }) => setTimeout(() => {
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
}
