import { ScriptInfo } from "../../types";
import { TranscriptManager } from "./TranscriptManager";
import { createCCElement, createStyleElement, waitThenAct, grabScripts, createTrackEditorDialog, createTrackDisplayDialog, displayTimestamp } from "./utils";

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
    indicatorContainerSelector?: string;
}

const speak = (ccElement: HTMLElement, text: string) => {
    const div = document.createElement("div");
    div.textContent = text;
    ccElement.prepend(div);
    console.debug("AD Message: ", text);
}

export class SRDManager {
    /** Data **/
    private script = new TranscriptManager();

    /** Player **/
    private trackUpdateInterval: NodeJS.Timeout[] = [];
    private videoElement: HTMLVideoElement | null = null;
    private currentKey: string | null = null;
    private ccElement: HTMLDivElement;

    /** Editing **/
    private _editMode = false;
    private editingMarker: number | null = null;

    get editMode() {
        return this._editMode;
    }
    private lastPlayedTimestamp = -1;
    private trackEditorDialog: HTMLDialogElement;
    private trackDisplayDialog: HTMLDialogElement;
    private _activeUpdating = false;
    private indicatorElement: HTMLDivElement | null = null;

    get activeUpdating() {
        return this._activeUpdating;
    }

    set activeUpdating(value: boolean) {
        this._activeUpdating = value;
        this.updateIndicator();
    }

    set editMode(value: boolean) {
        this._editMode = value;
        this.updateIndicator();
    }

    private updateIndicator() {
        if (!this.indicatorElement) {
            return;
        }
        
        if (!this.activeUpdating) {
            this.indicatorElement.textContent = "Here";
            return;
        }
        
        this.indicatorElement.textContent = this.editMode ? "Editing mode on" : "Editing mode off";
    }
    
    constructor(private params: DomainRegistrationParams){
        this.ccElement = createCCElement();
        this.trackEditorDialog = createTrackEditorDialog(() => {
            const isEditing = this.trackEditorDialog.getAttribute("data-isEditing") === "true";
            const timestamp = Number(this.trackEditorDialog.getAttribute("data-timestamp"));
            const trackEditorInput = this.trackEditorDialog.querySelector("input");
            if(isEditing){
                this.script.editTrack(timestamp, trackEditorInput.value);
            }else{
                this.script.addTrack(timestamp, trackEditorInput.value)
            }
            this.lastPlayedTimestamp = timestamp;
            trackEditorInput.value = "";
            this.trackEditorDialog.close();
            this.videoElement.currentTime = timestamp - 3;
            this.videoElement.play();
            this.editingMarker = null;
        });
        
        // Initialize save callback
        this.script.onSaveData = (data) => {
            void chrome.storage.local.set({ trackUpdates: data });
        };

        this.script.onTrackChange = () => {
            this.killTranscript();
            if (this.videoElement && !this.videoElement?.paused) {
                this.playTranscriptFrom(this.videoElement.currentTime);
            }
            console.log("Current tracks updated.");
        }
        this.trackDisplayDialog = createTrackDisplayDialog();

        // TODO: Set up indicator element

        // Setup storage listener for cross-extension communication
        chrome.storage.local.onChanged.addListener((changes) => {
            console.debug("[SRDManager] Storage changed:", changes);
            
            // Handle currentlyEditingId changes
            if (changes.currentlyEditingId) {
                const idData = changes.currentlyEditingId.newValue;
                if (idData && idData.id === this.currentKey?.split('-').pop()) {
                    this.activeUpdating = true;
                }
            }
            
            // Handle trackUpdates changes when activeUpdating is true
            if (changes.trackUpdates && this.activeUpdating) {
                const trackData = changes.trackUpdates.newValue;
                if (trackData && trackData.tracks && JSON.stringify(trackData.tracks) !== JSON.stringify(this.script.currentTracks)) {
                    this.script.loadData(trackData.tracks);
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

        // Setup indicator if container selector is provided
        if (this.params.indicatorContainerSelector) {
            waitThenAct<HTMLElement>(this.params.indicatorContainerSelector, (container) => {
                const indicator = document.createElement("div");
                indicator.textContent = "Here";
                indicator.style.cssText = "color: red; font-weight: bold; padding: 4px; border: 1px solid red; border-radius: 4px; background-color: rgba(255, 0, 0, 0.1); width: fit-content; height:20px;";
                container.appendChild(indicator);
                
                // Store reference to indicator for later updates
                this.indicatorElement = indicator;
                this.updateIndicator();
            });
        }

        // Wireup callbacks
        this.params.main({
            teardown: () => void this.teardown(),
            setup: (id, cb) => void this.setup(id, cb),
        })
    }

    get lastPlayedTrackIndex(){
        return this.script.currentTracks.findIndex(({timestamp}) => timestamp === this.lastPlayedTimestamp);
    }

    private async setup(videoId: string, errorCallback?: () => void){
        console.debug("[ScreenReaderDescription] - Setting up for", videoId);
        this.currentKey = `script-${this.params.platformId}-info-${videoId}`
        const serverPath = this.params.generateServerPath(videoId);
        const scripts = await grabScripts(this.currentKey, serverPath);
        this.script.currentTracks = scripts?.scripts[0].tracks ?? [];
        console.debug("[ScreenReaderDescription] - Grabbed script", scripts);

        // Check storage for currentlyEditingId and trackUpdates
        const storage = await chrome.storage.local.get(['currentlyEditingId', 'trackUpdates']);
        if (storage.currentlyEditingId && storage.currentlyEditingId.id === videoId && storage.trackUpdates && storage.trackUpdates.tracks) {
            this.script.currentTracks = storage.trackUpdates.tracks;
            this.activeUpdating = true;
            // Update indicator after setting activeUpdating
            this.updateIndicator();
            this.script.loadData(storage.trackUpdates.tracks);
        }else{
            const idData = {
                id: videoId,
                timestamp: Date.now()
            };
            void chrome.storage.local.set({ currentlyEditingId: idData });
        }
        
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
                container.appendChild(this.trackDisplayDialog);
                console.log("Dialogs", this.trackEditorDialog, this.trackDisplayDialog)
            });
        }

        if (!scripts) {
            errorCallback?.();
            return;
        }
        if (this.videoElement && !this.videoElement.paused) {
            this.playTranscriptFrom(this.videoElement.currentTime);
        }
    }

    teardown() {
        this.currentKey = null;
        this.script.teardown()
        this.ccElement.innerHTML = "";
    }

    playTranscriptFrom(startingSecond: number) {
        this.killTranscript();
        this.trackUpdateInterval = this.script.tracksToGo(startingSecond).map(({ text, timestamp }) => setTimeout(() => {
            this.lastPlayedTimestamp = timestamp;
            speak(this.ccElement, text);
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

    displayTranscript(){
        console.log("Displaying transcript...", this.trackDisplayDialog);
        this.trackDisplayDialog.querySelector("tbody").innerHTML = this.script.currentTracks.map(({text, timestamp}) => 
            `<tr><td>${displayTimestamp(timestamp)}</td><td ${timestamp === this.lastPlayedTimestamp ? "tabIndex='0'" : ""}>${text}</td></tr>`
        ).join("");
        this.trackDisplayDialog.showModal();
        (this.trackEditorDialog.querySelector("[tabIndex]") as HTMLTableCellElement | undefined)?.focus();
    }

    manageEditingMode(e: KeyboardEvent) {
        if(e.key === "r"){
            this.editMode = !this.editMode;
            speak(this.ccElement, `Editing mode: ${this.editMode ? "on" : "off"}`);
            return;
        }
        if(!this.editMode){
            return;
        }
        switch(e.key){
            case "t": {
                this.displayTranscript();
                break;
            }
            case "e": {
                // Edit last-played track
                e.preventDefault();
                e.stopPropagation();
                console.log("Edit track", this.lastPlayedTimestamp);
                if(this.lastPlayedTimestamp === -1){
                    return;
                }
                this.videoElement.pause();
                this.trackEditorDialog.setAttribute("data-isEditing", "true");
                this.trackEditorDialog.setAttribute("data-timestamp", `${this.lastPlayedTimestamp}`);
                const input = this.trackEditorDialog.querySelector("input");
                input.value = this.script.getTrackByTimestamp(this.lastPlayedTimestamp)?.text ?? "";
                this.trackEditorDialog.showModal();
                break;
            }
            case "f": {
                // Add new track
                this.videoElement.pause();
                this.trackEditorDialog.setAttribute("data-isEditing", "false");
                this.trackEditorDialog.setAttribute("data-timestamp", (this.editingMarker ?? this.videoElement.currentTime).toFixed(1));
                this.trackEditorDialog.showModal();
                e.preventDefault();
                e.stopPropagation();
                break;
            }
            case "d" : {
                // Mark
                this.editingMarker = this.videoElement.currentTime;
                speak(this.ccElement, "Marking track");
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
                const previousTrack = this.script.currentTracks[this.lastPlayedTrackIndex - 1];
                if(!previousTrack){
                    return;
                }
                this.videoElement.currentTime = previousTrack.timestamp;
                this.videoElement.play();
                break;
            }
            case "w": {
                // Next text
                const nextTrack = this.script.currentTracks[this.lastPlayedTrackIndex + 1];
                if(!nextTrack){
                    return;
                }
                this.videoElement.currentTime = nextTrack.timestamp;
                this.videoElement.play();
                break;
            }
            case "x": {
                // Move last-played track back
                if(this.lastPlayedTrackIndex < 0){
                    return;
                }
                let delta = -1;
                if(e.shiftKey){
                    delta = -.1;
                }
                this.lastPlayedTimestamp = this.script.moveTrack(this.lastPlayedTimestamp, delta);
                break;
            }
            case "c": {
                // Move last-played track forward
                if(this.lastPlayedTrackIndex < 0){
                    return;
                }
                let delta = 1;
                if(e.shiftKey){
                    delta = .1;
                }
                this.lastPlayedTimestamp = this.script.moveTrack(this.lastPlayedTimestamp, delta);
                break;
            }
            case "h": {
                console.log("show help");
                break;
            }
        }
    }
}
