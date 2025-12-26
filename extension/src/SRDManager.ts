import { ScriptInfo, EditableMetadata } from "../../types";
import { TranscriptManager } from "./TranscriptManager";
import { createCCElement, createStyleElement, waitThenAct, grabScripts, createTrackEditorDialog, createTrackDisplayDialog, createMetadataEditorDialog, createNotesDialog, displayTimestamp, generateTitleFromMetadata } from "./utils";
import { DOMAINS } from "./constants";

type DomainMainCallbacks = {
    teardown: () => void;
    setup: (id: string, errorCallback?: () => void) => void;
    updateMetadata: (metadata: Partial<EditableMetadata>) => void;
}
type DomainRegistrationParams = {
    style: string;
    videoSelector: string;
    platformId: ScriptInfo["source"]["domain"];
    ccContainerSelector: string;
    main: ({teardown, setup, updateMetadata}: DomainMainCallbacks) => void;

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

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS = {
    toggleEditMode: "r",
    displayTranscript: "t",
    export: "p",
    editTrack: "e",
    addTrack: "f",
    markPosition: "d",
    jumpBack: "a",
    jumpBackFine: "a", // Alt+a
    jumpForward: "s",
    jumpForwardFine: "s", // Alt+s
    previousTrack: "q",
    nextTrack: "w",
    moveTrackBack: "x",
    moveTrackBackFine: "x", // Shift+x
    moveTrackForward: "c",
    moveTrackForwardFine: "c", // Shift+c
    showHelp: "h",
    editMetadata: "m",
    openNotes: "n"
};

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
    private shortcuts: Record<string, string> = DEFAULT_SHORTCUTS;
    private metadata: EditableMetadata = {
        url: "",
        type: "other",
        title: "",
        author: "",
        language: "en-US"
    };
    private notes: {series: string, episode: string} = {
        series: "",
        episode: ""
    };

    get editMode() {
        return this._editMode;
    }
    private lastPlayedTimestamp = -1;
    private dialogs: {
        trackEditor: HTMLDialogElement;
        trackDisplay: HTMLDialogElement;
        metadataEditor: HTMLDialogElement;
        notesEditor: HTMLDialogElement;
    };
    private _activeUpdating = false;
    private indicatorElement: HTMLDivElement | null = null;
    private lastFocusedElement: HTMLElement | null;

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

    private createIndicator() {
        waitThenAct<HTMLElement>(this.params.indicatorContainerSelector, (container) => {
            const indicator = document.createElement("div");
            indicator.textContent = "Here";
            indicator.style.cssText = "color: red; font-weight: bold; padding: 4px; border: 1px solid red; border-radius: 4px; background-color: rgba(255, 0, 0, 0.1); width: fit-content; height:20px; margin: 4px";
            container.appendChild(indicator);
            console.debug("Adding indicator to screen...", indicator);
            
            // Store reference to indicator for later updates
            this.indicatorElement = indicator;
            this.updateIndicator();
        });
    }

    private updateIndicator() {
        if (!this.indicatorElement) {
            return;
        }
        console.debug("update indicator", this.activeUpdating, this.editMode, this.script.currentTracks)
        
        if(this.activeUpdating && this.editMode){
            this.indicatorElement.textContent = "Bridged and editing";
        }else if(this.activeUpdating){
            this.indicatorElement.textContent = "Bridged, no editing";
        }else if(this.editMode){
            this.indicatorElement.textContent = "Edit mode on";
        }else if(this.script.currentTracks.length === 0){
            this.indicatorElement.textContent = "SRD)))";
        }else{
            this.indicatorElement.textContent = "Described";
        }
    }
    
    constructor(private params: DomainRegistrationParams){
        this.ccElement = createCCElement();
        this.loadShortcuts();
        this.loadAuthorAndLanguageFromStorage();
        this.loadNotesFromStorage();
        this.dialogs = {
            trackEditor: createTrackEditorDialog(() => {
                const isEditing = this.dialogs.trackEditor.getAttribute("data-isEditing") === "true";
                const timestamp = Number(this.dialogs.trackEditor.getAttribute("data-timestamp"));
                const trackEditorInput = this.dialogs.trackEditor.querySelector("input");
            if(isEditing){
                this.script.editTrack(timestamp, trackEditorInput.value);
            }else{
                this.script.addTrack(timestamp, trackEditorInput.value)
            }
            this.lastPlayedTimestamp = timestamp;
            trackEditorInput.value = "";
            this.dialogs.trackEditor.close();
            this.videoElement.currentTime = timestamp - 3;
            this.videoElement.play();
            this.editingMarker = null;
        }, () => {
            const timestamp = Number(this.dialogs.trackEditor.getAttribute("data-timestamp"));
            const trackEditorInput = this.dialogs.trackEditor.querySelector("input");
            this.script.deleteTrack(timestamp);
            trackEditorInput.value = "";
            this.lastPlayedTimestamp = null;
            this.dialogs.trackEditor.close();
            this.videoElement.currentTime = timestamp - 3;
            this.videoElement.play();
            this.editingMarker = null;
        }),
            trackDisplay: createTrackDisplayDialog(),
            metadataEditor: createMetadataEditorDialog({
                submitCallback: (metadata) => {
                    console.log("Metadata saved:", metadata);
                    this.metadata = { ...this.metadata, ...metadata };
                    speak(this.ccElement, `Metadata saved: ${metadata.title}`);
                },
                getInitialMetadata: () => this.metadata,
                uploadCallback: (scriptData) => {
                    console.log("[SRDManager] Uploading script data", scriptData);
                    this.metadata = { 
                        ...this.metadata, 
                        ...scriptData.metadata,
                        url: scriptData.source.url,
                        videoId: scriptData.source.id,
                        author: scriptData.scripts[0].author,
                        language: scriptData.scripts[0].language,
                        seasonCheckbox: scriptData.metadata.season !== undefined,
                    };
                    this.script.currentTracks = scriptData.scripts[0].tracks;
                    speak(this.ccElement, `Script uploaded`);
                    this.dialogs.metadataEditor.close();
                }
            }),
            notesEditor: createNotesDialog((notes) => {
                console.log("Notes saved:", notes);
                this.notes = { ...this.notes, ...notes };
                this.saveNotesToStorage();
                speak(this.ccElement, `Notes saved`);
            }, () => this.notes)
        };

        // Setup event listeners for dialogs
        this.dialogs.trackDisplay.addEventListener("close", () => {
            this.lastFocusedElement?.focus();
            this.lastFocusedElement = null;
        });
        this.dialogs.trackDisplay.addEventListener("focusin", () => {
            console.debug("Track dialog received internal focus");
        });
        
        // Setup splice button
        const spliceButton = this.dialogs.trackDisplay.querySelector("#splice-button") as HTMLButtonElement;
        if (spliceButton) {
            spliceButton.addEventListener("click", () => {
                // TODO: Implement splice functionality
                console.log("Splice button clicked");
            });
        }

        this.script.onTrackChange = () => {
            this.killTranscript();
            if (this.videoElement && !this.videoElement?.paused) {
                this.playTranscriptFrom(this.videoElement.currentTime);
            }
            console.log("Current tracks updated.");
            this.updateIndicator();
        }

        // Setup storage listener for cross-extension communication
        chrome.storage.local.onChanged.addListener((changes) => {
            console.debug("[SRDManager] Storage changed:", changes);
            
            // Handle currentlyEditingId changes
            if (changes.currentlyEditingId) {
                const idData = changes.currentlyEditingId.newValue;
                if (idData && idData.id === this.currentKey?.split('-').pop()) {
                    console.debug("Currently editing ID matches current video ID")
                    this.activeUpdating = true;
         
                    // Initialize save callback
                    this.script.onSaveData = (data) => {
                        console.debug("Sending track updates", data);
                        void chrome.storage.local.set({ trackUpdates: data });
                    };
                }else{
                    this.activeUpdating = false;
                    this.script.onSaveData = null;
                }
            }
            
            // Handle trackUpdates changes when activeUpdating is true
            if (changes.trackUpdates){
                if(this.activeUpdating){
                    console.log("[SRDManager] Loading track updates", changes.trackUpdates.newValue);   
                    const trackData = changes.trackUpdates.newValue;
                    if (trackData && trackData.tracks && JSON.stringify(trackData.tracks) !== JSON.stringify(this.script.currentTracks)) {
                        console.log("[SRDManager] Loading track updates", trackData.tracks);
                        this.script.loadData(trackData.tracks);
                    }
                } else {
                    console.debug("[SRDManager] Unable to update tracks. Editing mode is not on. Saved as draft.");
                }
            }
            
            // Handle showIndicator changes
            if (changes.showIndicator) {
                const showIndicator = changes.showIndicator.newValue;
                if (this.params.indicatorContainerSelector) {
                    if (showIndicator && !this.indicatorElement) {
                        // Create indicator if it should be shown but doesn't exist
                        this.createIndicator();
                    } else if (!showIndicator && this.indicatorElement) {
                        // Remove indicator if it should be hidden but exists
                        this.indicatorElement?.remove();
                        this.indicatorElement = null;
                    }
                }
            }
            
            // Handle keyboard shortcuts changes
            if (changes.keyboardShortcuts) {
                const newShortcuts = changes.keyboardShortcuts.newValue;
                if (newShortcuts) {
                    this.shortcuts = { ...DEFAULT_SHORTCUTS, ...newShortcuts };
                    console.debug("Updated keyboard shortcuts:", this.shortcuts);
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
            // Check if indicator should be shown
            console.debug("Checking if indicator should be shown");
            chrome.storage.local.get({showIndicator: true}).then(({showIndicator}) => {
                if (showIndicator) {
                    this.createIndicator();
                }
            });
        }

        // Wireup callbacks
        this.params.main({
            teardown: () => void this.teardown(),
            setup: (id, cb) => void this.setup(id, cb),
            updateMetadata: (metadata) => void this.updateMetadata(metadata),
        })
    }

    get lastPlayedTrackIndex(){
        return this.script.currentTracks.findIndex(({timestamp}) => timestamp === this.lastPlayedTimestamp);
    }

    get currentMetadata() {
        return { ...this.metadata };
    }

    updateMetadata(newMetadata: Partial<EditableMetadata>) {
        this.metadata = { ...this.metadata, ...newMetadata };
        
        // Save only author and language to localStorage
        if (newMetadata.author !== undefined || newMetadata.language !== undefined) {
            this.saveAuthorAndLanguageToStorage();
        }
        
        console.debug("Metadata updated:", this.metadata);
    }

    private async loadAuthorAndLanguageFromStorage() {
        try {
            const {savedAuthor, savedLanguage} = await chrome.storage.local.get({
                savedAuthor: "",
                savedLanguage: "en-US"
            });
            this.metadata.author = savedAuthor;
            this.metadata.language = savedLanguage;
            console.debug("Author and language loaded from storage:", {author: savedAuthor, language: savedLanguage});
        } catch (error) {
            console.warn("Failed to load author and language from storage:", error);
        }
    }

    private async saveAuthorAndLanguageToStorage() {
        try {
            await chrome.storage.local.set({
                savedAuthor: this.metadata.author || "",
                savedLanguage: this.metadata.language || "en-US"
            });
            console.debug("Author and language saved to storage:", {author: this.metadata.author, language: this.metadata.language});
        } catch (error) {
            console.warn("Failed to save author and language to storage:", error);
        }
    }

    private async saveNotesToStorage() {
        try {
            await chrome.storage.local.set({
                savedNotes: {
                    notes: this.notes,
                    id: this.currentKey?.split('-').pop() || "",
                    seriesTitle: this.metadata.seriesTitle || ""
                }
            });
            console.debug("Notes saved to storage:", this.notes);
        } catch (error) {
            console.warn("Failed to save notes to storage:", error);
        }
    }

    private async loadNotesFromStorage() {
        try {
            const {savedNotes} = await chrome.storage.local.get({
                savedNotes: {
                    notes: {series: "", episode: ""},
                    id: "",
                    seriesTitle: ""
                }
            });
            console.debug("Notes loaded from storage:", savedNotes);
            if(savedNotes.id === this.currentKey?.split('-').pop()){
                this.notes.episode = savedNotes.notes.episode;
            }
            if(savedNotes.seriesTitle === this.metadata.seriesTitle){
                this.notes.series = savedNotes.notes.series;
            }
            console.debug("Using notes:", this.notes);
        } catch (error) {
            console.warn("Failed to load notes from storage:", error);
        }
    }

    private async loadShortcuts() {
        try {
            const {keyboardShortcuts} = await chrome.storage.local.get({keyboardShortcuts: DEFAULT_SHORTCUTS});
            this.shortcuts = { ...DEFAULT_SHORTCUTS, ...keyboardShortcuts };
        } catch (error) {
            console.warn("Failed to load custom shortcuts, using defaults:", error);
            this.shortcuts = DEFAULT_SHORTCUTS;
        }
    }

    private async setup(videoId: string, errorCallback?: () => void){
        console.debug("[ScreenReaderDescription] - Setting up for", videoId);
        this.currentKey = `script-${this.params.platformId}-info-${videoId}`
        
        // Fetch the transcript catalog from GitHub
        let catalog: Record<string, string> = {};
        try {
            const catalogResponse = await fetch('https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/refs/heads/main/generated-transcript-catalog.json');
            if (catalogResponse.ok) {
                catalog = await catalogResponse.json();
                console.debug("[ScreenReaderDescription] - Fetched catalog:", catalog);
            } else {
                console.warn("[ScreenReaderDescription] - Failed to fetch catalog, falling back to server path");
            }
        } catch (error) {
            console.warn("[ScreenReaderDescription] - Error fetching catalog:", error);
        }

        // Check storage for currentlyEditingId and trackUpdates
        const storage = await chrome.storage.local.get(['currentlyEditingId', 'trackUpdates', 'draftUpdates']);
        console.log("Checking details", videoId, storage);
        if (storage.currentlyEditingId && storage.currentlyEditingId.id === videoId && storage.trackUpdates && storage.trackUpdates.tracks) {
            this.script.currentTracks = storage.trackUpdates.tracks;
            this.activeUpdating = true;
            console.log("[SRDManager] Loading track updates", storage.trackUpdates.tracks);
            // Update indicator after setting activeUpdating
            this.script.loadData(storage.trackUpdates.tracks);
            
            // Initialize save callback
            this.script.onSaveData = (data) => {
                console.debug("[onSaveData]", data);
                void chrome.storage.local.set({ trackUpdates: data });
            };
        }else{
        this.activeUpdating = false;
        
        // Check for draft updates for this specific video
        if (storage.draftUpdates && storage.draftUpdates[this.currentKey]) {
            const draft = storage.draftUpdates[this.currentKey];
            console.debug("[setup] Loading draft updates:", draft);
            
            // Load draft tracks if present
            if (draft.tracks) {
                this.script.currentTracks = draft.tracks;
                console.log("[SRDManager] Loading draft updates", draft.tracks);
                this.script.loadData(draft.tracks);
            }
            
            // Load draft metadata if present
            if (draft.metadata) {
                this.metadata = { ...this.metadata, ...draft.metadata };
            }
        }
        
        this.script.onSaveData = (data) => {
            // Save as draftUpdates keyed by currentKey, including tracks and metadata
            const draft = {
                tracks: data.tracks,
                metadata: this.metadata
            };
            chrome.storage.local.get({ draftUpdates: {} }).then((result) => {
                const draftUpdates = { ...result.draftUpdates, [this.currentKey]: draft };
                void chrome.storage.local.set({ draftUpdates });
                console.debug("[onSaveData] Draft saved to local storage:", draftUpdates);
            });
        };
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
                console.debug("Wiring listener for editing: ", container)
                container.addEventListener("keydown", (e) => {
                    
                    // Don't handle keydown events from within dialogs
                    if (e.target instanceof HTMLElement) {
                        const isInDialog = e.target.closest('dialog');
                        if (isInDialog) {
                            console.debug("Ignoring keydown from dialog:", e.target);
                            e.stopPropagation();
                            return;
                        }
                    }
                    
                    this.manageEditingMode(e);
                });
                Object.values(this.dialogs).forEach((dialog) => {
                    container.appendChild(dialog);
                });
                // Setup dialog movement functionality
                this.setupDialogMovement();
            });
        }

        // Look up the transcript location in the catalog
        const catalogKey = `${this.params.platformId}-${videoId}`;
        const serverPath = `https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/refs/heads/main${catalog[catalogKey]}`
        
        const scripts = await grabScripts(this.currentKey, serverPath);
        console.debug("[ScreenReaderDescription] - Grabbed script", scripts);
        if(scripts?.scripts[0].tracks){
            console.log("[SRDManager] Loading script tracks", scripts.scripts[0].tracks);
            this.script.currentTracks = scripts?.scripts[0].tracks;
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

    async loadAvailableScripts() {
        const listKeys = DOMAINS.map((str) => `script-${str}-list`);
        
        // Get saved descriptions
        const myList = Object.values((await chrome.storage.local.get(listKeys)) ?? {}).flat();
        const allScripts: ScriptInfo[] = Object.values(await chrome.storage.local.get(myList));
        
        // Get saved drafts
        const storage = await chrome.storage.local.get(['draftUpdates']);
        const draftUpdates = storage.draftUpdates || {};
        
        const availableScriptsList = this.dialogs.trackDisplay.querySelector("#available-scripts-list");
        if (!availableScriptsList) return;
        
        availableScriptsList.innerHTML = "";
        
        // Display saved descriptions
        if (allScripts.length > 0) {
            const savedHeader = document.createElement("h4");
            savedHeader.textContent = "Saved Descriptions:";
            availableScriptsList.appendChild(savedHeader);
            
            allScripts.forEach((script) => {
                const div = document.createElement("div");
                div.textContent = generateTitleFromMetadata(script.metadata);
                availableScriptsList.appendChild(div);
            });
        }
        
        // Display saved drafts
        const draftKeys = Object.keys(draftUpdates);
        if (draftKeys.length > 0) {
            const draftsHeader = document.createElement("h4");
            draftsHeader.textContent = "Saved Drafts:";
            draftsHeader.style.marginTop = "12px";
            availableScriptsList.appendChild(draftsHeader);
            
            draftKeys.forEach((key) => {
                const draft = draftUpdates[key];
                const div = document.createElement("div");
                if (draft.metadata) {
                    div.textContent = generateTitleFromMetadata(draft.metadata);
                } else {
                    div.textContent = key;
                }
                availableScriptsList.appendChild(div);
            });
        }
        
        if (allScripts.length === 0 && draftKeys.length === 0) {
            availableScriptsList.textContent = "No scripts available";
        }
    }

    displayTranscript(){
        console.log("Displaying transcript...", this.dialogs.trackDisplay, this.lastPlayedTimestamp);
        this.dialogs.trackDisplay.querySelector("tbody").innerHTML = ""
        this.dialogs.trackDisplay.setAttribute("data-isEditing", this.editMode ? "true" : "false");
        
        // Load available scripts
        void this.loadAvailableScripts();
        
        const fragment = document.createDocumentFragment();
        this.script.currentTracks.forEach(({text, timestamp}, index) => {
            const tr = document.createElement("tr");
            const timestampTd = document.createElement("td");
            const timestampButton = document.createElement("button");
            timestampButton.textContent = displayTimestamp(timestamp);
            timestampButton.addEventListener("click", () => {
                this.videoElement.currentTime = timestamp;
                this.videoElement.play();
                this.dialogs.trackDisplay.close();
            });
            timestampTd.appendChild(timestampButton);
            tr.appendChild(timestampTd);

            const textTd = document.createElement("td");
            textTd.setAttribute("data-raw-timestamp", `${timestamp}`);
            textTd.setAttribute("tabIndex", "-1");
            textTd.textContent = text;
            tr.appendChild(textTd);

            const toolsTd = document.createElement("td");
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                this.script.deleteTrack(timestamp);
                // Update the display after deletion
                this.displayTranscript();
            });
            toolsTd.appendChild(deleteButton);
            const pushButton = document.createElement("button");
            pushButton.textContent = "Push";
            pushButton.addEventListener("click", () => {
                const tracks = this.script.currentTracks;
                if (index > 0) {
                    // Concatenate current text to previous track's text
                    const prevTrack = tracks[index - 1];
                    const currTrack = tracks[index];
                    const newPrevText = prevTrack.text + " " + currTrack.text;
                    // Update previous track
                    this.script.editTrack(prevTrack.timestamp, newPrevText);
                    // Delete current track
                    this.script.deleteTrack(currTrack.timestamp);
                    // Update the display after push
                    this.displayTranscript();
                } else {
                    console.error("No previous track to push to");
                }
            });
            const splitButton = document.createElement("button");
            splitButton.textContent = "Split";
            const currTrack = this.script.currentTracks[index];
            const currTimestamp = currTrack.timestamp;
            const currText = currTrack.text;

            // Split text into sentences (simple regex, can be improved)
            const sentences = currText.match(/[^.!?]+[.!?]+[\])'"`’”]*|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [];
            if(sentences.length < 1){
                splitButton.disabled = true;
                return;
            }else{
                splitButton.addEventListener("click", () => {
    
                    if (sentences.length <= 1) {
                        // Nothing to split
                        return;
                    }
    
                    // Remove the current track
                    this.script.deleteTrack(currTimestamp);
    
                    // Insert new tracks for each sentence, spaced by 1 second
                    for (let i = 0; i < sentences.length; i++) {
                        const newTimestamp = currTimestamp + i;
                        this.script.addTrack(newTimestamp, sentences[i]);
                    }
    
                    // Update the display after split
                    this.displayTranscript();
                });
            }
            toolsTd.appendChild(splitButton);
            if(index > 0){
                toolsTd.appendChild(pushButton);
            }
            tr.appendChild(toolsTd);

            fragment.appendChild(tr);
        });
        this.dialogs.trackDisplay.querySelector("tbody").appendChild(fragment);
        this.lastFocusedElement = document.activeElement as HTMLElement;
        console.debug("Display track: ", this.dialogs.trackDisplay)
        this.dialogs.trackDisplay.showModal();
        const focusedTextElement = this.dialogs.trackDisplay.querySelector(`[data-raw-timestamp="${this.lastPlayedTimestamp}"]`) as HTMLTableCellElement | undefined;
        focusedTextElement?.focus();
    }

    exportScript(){
        // Placeholder for export functionality
        const videoId = this.currentKey?.split('-').pop() || "";
        const scriptData: ScriptInfo = {
            source: {
                url: this.metadata.url,
                domain: this.params.platformId,
                id: videoId
            },
            metadata: {
                type: this.metadata.type,
                title: this.metadata.title,
                creator: this.metadata.creator,
                seriesTitle: this.metadata.seriesTitle,
                season: this.metadata.season,
                episode: this.metadata.episode
            },
            scripts: [{
                language: "en-US",
                author: this.metadata.author,
                tracks: this.script.currentTracks
            }]
        };

        // Create and trigger download
        const element = document.createElement("a");
        element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(scriptData))}`);
        element.setAttribute("download", `${this.metadata.title || 'script'}.json`);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        speak(this.ccElement, "Script exported successfully");
    }

    private moveDialog(dialog: HTMLDialogElement, direction: 'up' | 'down' | 'left' | 'right') {
        if (!dialog.open) return;

        const step = 20; // pixels to move
        const currentTop = parseInt(dialog.style.top) || 0;
        const currentLeft = parseInt(dialog.style.left) || 0;

        switch (direction) {
            case 'up':
                dialog.style.top = `${Math.max(0, currentTop - step)}px`;
                break;
            case 'down':
                dialog.style.top = `${currentTop + step}px`;
                break;
            case 'left':
                dialog.style.left = `${Math.max(0, currentLeft - step)}px`;
                break;
            case 'right':
                dialog.style.left = `${currentLeft + step}px`;
                break;
        }

        // Ensure dialog stays within viewport bounds
        const rect = dialog.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth) {
            dialog.style.left = `${viewportWidth - rect.width}px`;
        }
        if (rect.bottom > viewportHeight) {
            dialog.style.top = `${viewportHeight - rect.height}px`;
        }
        if (rect.left < 0) {
            dialog.style.left = '0px';
        }
        if (rect.top < 0) {
            dialog.style.top = '0px';
        }
    }

    private setupDialogMovement() {
        Object.values(this.dialogs).forEach(dialog => {
            dialog.addEventListener('keydown', (e) => {
                // Check for Ctrl+Shift+arrow key combination
                if (e.shiftKey && e.altKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    switch (e.key) {
                        case 'ArrowUp':
                            this.moveDialog(dialog, 'up');
                            break;
                        case 'ArrowDown':
                            this.moveDialog(dialog, 'down');
                            break;
                        case 'ArrowLeft':
                            this.moveDialog(dialog, 'left');
                            break;
                        case 'ArrowRight':
                            this.moveDialog(dialog, 'right');
                            break;
                    }
                }
            });
        });
    }

    manageEditingMode(e: KeyboardEvent) {
        const key = e.key.toLowerCase();

        // General shortcuts (always available)
        if(key === this.shortcuts.toggleEditMode){
            this.editMode = !this.editMode;
            speak(this.ccElement, `Editing mode: ${this.editMode ? "on" : "off"}`);
            return;
        }else if(key === this.shortcuts.displayTranscript){
            console.log("[SRDManager] Displaying transcript", this.script.currentTracks);
            this.displayTranscript();
            return;
        }

        if(!this.editMode){
            return;
        }

        switch(key){
            case this.shortcuts.editTrack: {
                // Edit last-played track
                e.preventDefault();
                e.stopPropagation();
                console.log("Edit track", this.lastPlayedTimestamp);
                if(this.lastPlayedTimestamp === -1){
                    return;
                }
                this.videoElement.pause();
                this.dialogs.trackEditor.setAttribute("data-isEditing", "true");
                this.dialogs.trackEditor.setAttribute("data-timestamp", `${this.lastPlayedTimestamp}`);
                const input = this.dialogs.trackEditor.querySelector("input");
                input.value = this.script.getTrackByTimestamp(this.lastPlayedTimestamp)?.text ?? "";
                this.dialogs.trackEditor.showModal();
                break;
            }
            case this.shortcuts.addTrack: {
                // Add new track
                this.videoElement.pause();
                this.dialogs.trackEditor.setAttribute("data-isEditing", "false");
                this.dialogs.trackEditor.setAttribute("data-timestamp", (this.editingMarker ?? this.videoElement.currentTime).toFixed(1));
                this.dialogs.trackEditor.showModal();
                e.preventDefault();
                e.stopPropagation();
                break;
            }
            case this.shortcuts.markPosition: {
                // Mark
                this.editingMarker = this.videoElement.currentTime;
                speak(this.ccElement, "Marking track");
                break;
            }
            case this.shortcuts.jumpBack: {
                let delta = 5;
                if(e.altKey && this.shortcuts.jumpBackFine === this.shortcuts.jumpBack){
                    delta = 1;
                }
                // Jump back
                this.videoElement.currentTime = this.videoElement.currentTime - delta;
                break;
            }
            case this.shortcuts.jumpForward: {
                let delta = 5;
                if(e.altKey && this.shortcuts.jumpForwardFine === this.shortcuts.jumpForward){
                    delta = 1;
                }
                // Jump forward
                this.videoElement.currentTime = this.videoElement.currentTime + delta;
                break;
            }
            case this.shortcuts.previousTrack: {
                // Previous text
                const previousTrack = this.script.currentTracks[this.lastPlayedTrackIndex - 1];
                if(!previousTrack){
                    return;
                }
                this.videoElement.currentTime = previousTrack.timestamp;
                this.videoElement.play();
                break;
            }
            case this.shortcuts.nextTrack: {
                // Next text
                const nextTrack = this.script.currentTracks[this.lastPlayedTrackIndex + 1];
                if(!nextTrack){
                    return;
                }
                this.videoElement.currentTime = nextTrack.timestamp;
                this.videoElement.play();
                break;
            }
            case this.shortcuts.moveTrackBack: {
                // Move last-played track back
                if(this.lastPlayedTrackIndex < 0){
                    return;
                }
                let delta = -1;
                if(e.shiftKey){
                    delta = -0.1;
                }
                this.lastPlayedTimestamp = this.script.moveTrack(this.lastPlayedTimestamp, delta);
                speak(this.ccElement, `Minus ${delta} seconds`);
                break;
            }
            case this.shortcuts.moveTrackForward: {
                // Move last-played track forward
                if(this.lastPlayedTrackIndex < 0){
                    return;
                }
                let delta = 1;
                if(e.shiftKey){
                    delta = 0.1;
                }
                this.lastPlayedTimestamp = this.script.moveTrack(this.lastPlayedTimestamp, delta);
                speak(this.ccElement, `Plus ${delta} seconds`);
                break;
            }
            case this.shortcuts.showHelp: {
                console.log("show help");
                break;
            }
            case this.shortcuts.editMetadata: {
                // Edit metadata
                this.videoElement.pause();
                this.dialogs.metadataEditor.showModal();
                e.preventDefault();
                e.stopPropagation();
                break;
            }
            case this.shortcuts.openNotes: {
                // Open notes dialog
                this.videoElement.pause();
                this.dialogs.notesEditor.showModal();
                e.preventDefault();
                e.stopPropagation();
                break;
            }
            case this.shortcuts.export: {
                // Export script
                this.exportScript();
                e.preventDefault();
                e.stopPropagation();
                break;
            }
        }
    }
}
