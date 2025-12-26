import type { ScriptInfo, EditableMetadata } from "../../types";
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

export const createTrackEditorDialog = (submitCallback: () => void, deleteCallback: () => void) => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("data-trackIndex", "-1");
    dialog.setAttribute("data-timestamp", "-1");
    const trackEditorInput = document.createElement("input");
    const trackSubmitButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    trackSubmitButton.textContent = "Submit";
    trackSubmitButton.style.display = "block";
    trackSubmitButton.addEventListener("click", submitCallback);
    deleteButton.textContent = "Delete";
    deleteButton.style.display = "block";
    deleteButton.addEventListener("click", deleteCallback);        
    trackEditorInput.addEventListener("keydown", (e) => {
        if(e.key === "Enter"){
            submitCallback();
        }
        e.stopPropagation()
    });
    dialog.appendChild(trackEditorInput);
    dialog.appendChild(trackSubmitButton);
    dialog.appendChild(deleteButton);

    dialog.addEventListener("close", () => {
        dialog.setAttribute("data-isEditing", "false");
        trackEditorInput.value = "";
    });
    return dialog;
}

export const createTrackDisplayDialog = () => {
    
    const dialog = document.createElement("dialog");
    dialog.id = "ScreenReaderDescription-track-display";
    dialog.setAttribute("data-isEditing", "false");
    dialog.innerHTML = `<button id="close-button">Close</button><button id="splice-button">Splice</button>
    <div id="available-scripts">
        <h3>Available Scripts</h3>
        <div id="available-scripts-list">Loading...</div>
    </div>
    <table>
        <thead>
            <tr>
                <th scole="col">Timestamp</th>
                <th scope="col">Text</th>
                <th scope="col">Tools</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>`;
    dialog.querySelector("#close-button").addEventListener("click", () => {
        dialog.close();
    });
    dialog.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
            dialog.close()
        }
    })
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

export const generateTitleFromMetadata = (metadata: { type: string, title?: string, creator?: string, seriesTitle?: string, episode?: number, season?: number }) => {
    switch (metadata.type) {
        case "other":
        case "music video": {
            return `[${metadata.creator?.trim()}] ${metadata.title}`;
        }
        case "television episode": {
            return `${metadata.seriesTitle} ${typeof metadata.season !== "undefined" ? `S${metadata.season}` : ""}E${metadata.episode} - ${metadata.title}`;
        }
        case "movie":
        default: {
            return metadata.title;
        }
    }
};

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

export const createNotesDialog = (submitCallback: (notes: {series: string, episode: string}) => void, getInitialNotes?: () => {series: string, episode: string}) => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `
        <div style="padding: 20px; min-width: 600px; max-width: 800px;">
            <h3 style="margin-bottom: 16px;">Notes</h3>
            
            <form id="notes-form">
                <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <label for="notes-series" style="display: block; margin-bottom: 8px; font-weight: 500;">Series:</label>
                        <textarea id="notes-series" style="width: 100%; height: 300px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit; font-size: 14px;" placeholder="Enter series notes here..."></textarea>
                    </div>
                    <div style="flex: 1;">
                        <label for="notes-episode" style="display: block; margin-bottom: 8px; font-weight: 500;">Episode:</label>
                        <textarea id="notes-episode" style="width: 100%; height: 300px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit; font-size: 14px;" placeholder="Enter episode notes here..."></textarea>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" id="notes-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button type="submit" id="notes-submit" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                </div>
            </form>
        </div>
    `;
    
    const form = dialog.querySelector("#notes-form") as HTMLFormElement;
    const seriesTextarea = dialog.querySelector("#notes-series") as HTMLTextAreaElement;
    const episodeTextarea = dialog.querySelector("#notes-episode") as HTMLTextAreaElement;
    const cancelButton = dialog.querySelector("#notes-cancel") as HTMLButtonElement;

    // Populate fields with initial data
    const populateFields = () => {
        if (getInitialNotes) {
            const initialNotes = getInitialNotes();
            seriesTextarea.value = initialNotes.series || "";
            episodeTextarea.value = initialNotes.episode || "";
        }
    };

    // Override showModal to populate fields
    const originalShowModal = dialog.showModal.bind(dialog);
    dialog.showModal = () => {
        populateFields();
        originalShowModal();
    };

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const notes = {
            series: seriesTextarea.value,
            episode: episodeTextarea.value
        };

        submitCallback(notes);
        dialog.close();
    });
    
    cancelButton.addEventListener("click", () => {
        dialog.close();
    });

    return dialog;
};

export interface CreateMetadataEditorDialogOptions {
    submitCallback: (metadata: EditableMetadata) => void;
    getInitialMetadata?: () => EditableMetadata;
    uploadCallback?: (scriptData: ScriptInfo) => void;
}

export const createMetadataEditorDialog = ({
    submitCallback,
    getInitialMetadata,
    uploadCallback
}: CreateMetadataEditorDialogOptions) => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `
        <div style="padding: 20px; min-width: 500px; max-width: 600px; position: relative;">
            <input type="file" id="metadata-upload" accept=".json" style="display: none;">
            <button type="button" id="metadata-upload-button" style="position: absolute; top: 20px; right: 20px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Upload Script</button>
            
            <h3 style="margin-bottom: 16px;">Edit Metadata</h3>
            
            <form id="metadata-form">
                <div style="margin-bottom: 12px;">
                    <label for="metadata-url" style="display: block; margin-bottom: 4px; font-weight: 500;">URL:</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="metadata-url" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <button type="button" id="metadata-open-url" style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;" disabled>Open</button>
                    </div>
                </div>

                <div id="metadata-video-id-container" style="margin-bottom: 12px; display: none;">
                    <label for="metadata-video-id" style="display: block; margin-bottom: 4px; font-weight: 500;">ID:</label>
                    <input type="text" id="metadata-video-id" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="margin-bottom: 12px;">
                    <label for="metadata-type" style="display: block; margin-bottom: 4px; font-weight: 500;">Type:</label>
                    <select id="metadata-type" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="movie">Movie</option>
                        <option value="television episode">TV episode</option>
                        <option value="music video">Music video</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div style="margin-bottom: 12px;">
                    <label for="metadata-title" style="display: block; margin-bottom: 4px; font-weight: 500;">Title:</label>
                    <input type="text" id="metadata-title" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="margin-bottom: 12px;">
                    <label for="metadata-author" style="display: block; margin-bottom: 4px; font-weight: 500;">Author:</label>
                    <input type="text" id="metadata-author" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="margin-bottom: 12px;">
                    <label for="metadata-language" style="display: block; margin-bottom: 4px; font-weight: 500;">Language:</label>
                    <input type="text" id="metadata-language" value="en-US" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div id="metadata-series-container" style="margin-bottom: 12px; display: none;">
                    <label for="metadata-series-title" style="display: block; margin-bottom: 4px; font-weight: 500;">Series Title:</label>
                    <input type="text" id="metadata-series-title" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div id="metadata-season-container" style="margin-bottom: 12px; display: none;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">
                        <input type="checkbox" id="metadata-season-checkbox" style="margin-right: 8px;">
                        Season
                    </label>
                    <input type="number" id="metadata-season" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; display: none;" disabled>
                </div>

                <div id="metadata-episode-container" style="margin-bottom: 12px; display: none;">
                    <label for="metadata-episode" style="display: block; margin-bottom: 4px; font-weight: 500;">Episode:</label>
                    <input type="number" id="metadata-episode" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div id="metadata-creator-container" style="margin-bottom: 16px; display: none;">
                    <label for="metadata-creator" style="display: block; margin-bottom: 4px; font-weight: 500;">Creator:</label>
                    <input type="text" id="metadata-creator" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" id="metadata-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button type="submit" id="metadata-submit" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                </div>
            </form>
        </div>
    `;
    
    const urlInput = dialog.querySelector("#metadata-url") as HTMLInputElement;
    const videoIdContainer = dialog.querySelector("#metadata-video-id-container") as HTMLDivElement;
    const videoIdInput = dialog.querySelector("#metadata-video-id") as HTMLInputElement;
    const openUrlButton = dialog.querySelector("#metadata-open-url") as HTMLButtonElement;
    const typeSelect = dialog.querySelector("#metadata-type") as HTMLSelectElement;
    const titleInput = dialog.querySelector("#metadata-title") as HTMLInputElement;
    const authorInput = dialog.querySelector("#metadata-author") as HTMLInputElement;
    const languageInput = dialog.querySelector("#metadata-language") as HTMLInputElement;
    const seriesContainer = dialog.querySelector("#metadata-series-container") as HTMLDivElement;
    const seriesTitleInput = dialog.querySelector("#metadata-series-title") as HTMLInputElement;
    const seasonContainer = dialog.querySelector("#metadata-season-container") as HTMLDivElement;
    const seasonCheckbox = dialog.querySelector("#metadata-season-checkbox") as HTMLInputElement;
    const seasonInput = dialog.querySelector("#metadata-season") as HTMLInputElement;
    const episodeContainer = dialog.querySelector("#metadata-episode-container") as HTMLDivElement;
    const episodeInput = dialog.querySelector("#metadata-episode") as HTMLInputElement;
    const creatorContainer = dialog.querySelector("#metadata-creator-container") as HTMLDivElement;
    const creatorInput = dialog.querySelector("#metadata-creator") as HTMLInputElement;
    const uploadInput = dialog.querySelector("#metadata-upload") as HTMLInputElement;
    const uploadButton = dialog.querySelector("#metadata-upload-button") as HTMLButtonElement;
    const form = dialog.querySelector("#metadata-form") as HTMLFormElement;
    const submitButton = dialog.querySelector("#metadata-submit") as HTMLButtonElement;
    const cancelButton = dialog.querySelector("#metadata-cancel") as HTMLButtonElement;

    // Show/hide fields based on type
    const updateFieldsVisibility = () => {
        const isTelevisionEpisode = typeSelect.value === "television episode";
        const isEmbyUrl = urlInput.value.includes("emby.");
        
        seriesContainer.style.display = isTelevisionEpisode ? "block" : "none";
        seasonContainer.style.display = isTelevisionEpisode ? "block" : "none";
        episodeContainer.style.display = isTelevisionEpisode ? "block" : "none";
        creatorContainer.style.display = isTelevisionEpisode ? "none" : "block";
        videoIdContainer.style.display = isEmbyUrl ? "block" : "none";
    };

    // Update season input visibility and enabled state
    const updateSeasonInput = () => {
        if (seasonCheckbox.checked) {
            seasonInput.style.display = "block";
            seasonInput.disabled = false;
        } else {
            seasonInput.style.display = "none";
            seasonInput.disabled = true;
        }
    };

    // Event listeners
    typeSelect.addEventListener("change", updateFieldsVisibility);
    urlInput.addEventListener("input", () => {
        updateFieldsVisibility();
        openUrlButton.disabled = !urlInput.value;
    });
    seasonCheckbox.addEventListener("change", updateSeasonInput);
    
    openUrlButton.addEventListener("click", () => {
        if (urlInput.value) {
            window.open(urlInput.value, '_blank');
        }
    });

    // Upload button functionality
    uploadButton.addEventListener("click", () => {
        uploadInput.click();
    });

    uploadInput.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const scriptData = JSON.parse(text);

            // Call uploadCallback if provided
            if (uploadCallback) {
                uploadCallback(scriptData);
            }

            // Populate metadata fields from uploaded script
            if (scriptData.source) {
                urlInput.value = scriptData.source.url || "";
                videoIdInput.value = scriptData.source.id || "";
            }
            
            if (scriptData.metadata) {
                typeSelect.value = scriptData.metadata.type || "other";
                titleInput.value = scriptData.metadata.title || "";
                authorInput.value = scriptData.metadata.author || "";
                languageInput.value = scriptData.metadata.language || "en-US";
                
                if (scriptData.metadata.seriesTitle) {
                    seriesTitleInput.value = scriptData.metadata.seriesTitle;
                }
                if (scriptData.metadata.season !== undefined) {
                    seasonCheckbox.checked = true;
                    seasonInput.value = String(scriptData.metadata.season);
                }
                if (scriptData.metadata.episode !== undefined) {
                    episodeInput.value = String(scriptData.metadata.episode);
                }
                if (scriptData.metadata.creator) {
                    creatorInput.value = scriptData.metadata.creator;
                }
            }
            
            updateFieldsVisibility();
            updateSeasonInput();
            openUrlButton.disabled = !urlInput.value;
            
        } catch (error) {
            console.error("Error parsing uploaded file:", error);
            alert("Error parsing uploaded file. Please ensure it's a valid JSON script file.");
        }
    });
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const metadata: any = {
            url: urlInput.value,
            type: typeSelect.value,
            title: titleInput.value,
            author: authorInput.value,
            language: languageInput.value
        };

        if (videoIdContainer.style.display !== "none") {
            metadata.videoId = videoIdInput.value;
        }

        if (typeSelect.value === "television episode") {
            if (seriesTitleInput.value) {
                metadata.seriesTitle = seriesTitleInput.value;
            }
            if (seasonCheckbox.checked) {
                metadata.season = parseInt(seasonInput.value) || 0;
            }
            metadata.seasonCheckbox = seasonCheckbox.checked;
            metadata.episode = parseInt(episodeInput.value) || 0;
        } else {
            if (creatorInput.value) {
                metadata.creator = creatorInput.value;
            }
        }

        submitCallback(metadata);
        dialog.close();
    });
    
    cancelButton.addEventListener("click", () => {
        dialog.close();
    });
    
    dialog.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
            dialog.close();
        } else if(e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            submitButton.click();
        }
    });
    
    dialog.addEventListener("close", () => {
        urlInput.value = "";
        videoIdInput.value = "";
        typeSelect.value = "other";
        titleInput.value = "";
        authorInput.value = "";
        languageInput.value = "en-US";
        seriesTitleInput.value = "";
        seasonCheckbox.checked = true;
        seasonInput.value = "0";
        episodeInput.value = "0";
        creatorInput.value = "";
        updateFieldsVisibility();
        updateSeasonInput();
    });
    
    // Function to populate fields with initial metadata
    const populateFields = () => {
        if (getInitialMetadata) {
            const initialData = getInitialMetadata();
            urlInput.value = initialData.url || "";
            videoIdInput.value = initialData.videoId || "";
            typeSelect.value = initialData.type || "other";
            titleInput.value = initialData.title || "";
            authorInput.value = initialData.author || "";
            languageInput.value = initialData.language || "en-US";
            seriesTitleInput.value = initialData.seriesTitle || "";
            seasonCheckbox.checked = initialData.seasonCheckbox ?? true;
            seasonInput.value = String(initialData.season || 0);
            episodeInput.value = String(initialData.episode || 0);
            creatorInput.value = initialData.creator || "";
            
            updateFieldsVisibility();
            updateSeasonInput();
            openUrlButton.disabled = !urlInput.value;
        }
    };

    // Override the showModal method to populate fields when dialog opens
    const originalShowModal = dialog.showModal.bind(dialog);
    dialog.showModal = () => {
        populateFields();
        originalShowModal();
    };

    // Initialize
    updateFieldsVisibility();
    updateSeasonInput();
    
    return dialog;
}

