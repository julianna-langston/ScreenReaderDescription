import type { ScriptInfo, ScriptMetadata } from "../../types";
import { renderTimestamp, generateExportFilename } from "./utils";
import { DOMAINS } from "./constants";

const listKeys = DOMAINS.map((str) => `script-${str}-list`);

const generateTitleFromMetadata = ({ type, title, creator, seriesTitle, episode, season }: ScriptMetadata) => {
    switch (type) {
        case "other":
        case "music video": {
            return `[${creator?.trim()}] ${title}`;
        }
        case "television episode": {
            return `${seriesTitle} ${typeof season !== "undefined" ? `S${season}` : ""}E${episode} - ${title}`;
        }
        case "movie":
        default: {
            return title;
        }
    }
};
const downloadTracks = (filename: string, text: string) => {
    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};
const refreshList = async () => {
    const myList = Object.values((await chrome.storage.local.get(listKeys)) ?? {}).flat();
    const allScripts = Object.values(await chrome.storage.local.get(myList)).toSorted((left, right) => {
        if (left.source.domain < right.source.domain) {
            return -1;
        }
        if (left.source.domain > right.source.domain) {
            return 1;
        }
        if (left.metadata.seriesTitle < right.metadata.seriesTitle) {
            return -1;
        }
        if (left.metadata.seriesTitle > right.metadata.seriesTitle) {
            return 1;
        }
        if (left.metadata.season < right.metadata.season) {
            return -1;
        }
        if (left.metadata.season > right.metadata.season) {
            return 1;
        }
        if (left.metadata.episode < right.metadata.episode) {
            return -1;
        }
        if (left.metadata.episode > right.metadata.episode) {
            return 1;
        }
        if (left.metadata.title < right.metadata.title) {
            return -1;
        }
        if (left.metadata.title > right.metadata.title) {
            return 1;
        }
        return 0;
    });
    showList(allScripts);
};
const showList = (list: ScriptInfo[]) => {
    const table = document.getElementById("displayList");
    table.innerHTML = `<tr>
        <td>Domain</td>
        <td>Title</td>
        <td>Line Count</td>
        <td>Last Timestamp</td>
        <td>Export</td>
        <td>Delete</td>
    </tr>`;
    list.forEach((json) => {
        const tr = document.createElement("tr");
        const td0 = document.createElement("td");
        td0.textContent = json.source.domain;
        tr.appendChild(td0);
        
        const td1 = document.createElement("td");
        const a = document.createElement("a");
        a.href = json.source.url;
        a.textContent = generateTitleFromMetadata(json.metadata);
        td1.appendChild(a);
        tr.appendChild(td1);

        const td3 = document.createElement("td");
        td3.textContent = `${json.scripts[0].tracks.length}`;
        tr.appendChild(td3);
        const td6 = document.createElement("td");
        if (json.scripts[0].tracks.length > 0) {
            td6.textContent = renderTimestamp(json.scripts.at(0).tracks.at(-1).timestamp);
        }
        tr.appendChild(td6);

        const td2 = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "Export";
        btn.draggable = true;
        btn.addEventListener("click", () => downloadTracks(generateExportFilename(json.metadata), JSON.stringify(json)));
        btn.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify(json));
            e.dataTransfer.dropEffect = "copy";
        });
        td2.appendChild(btn);
        tr.appendChild(td2);

        const td4 = document.createElement("td");
        const btn2 = document.createElement("button");
        btn2.textContent = "Delete";
        btn2.addEventListener("click", () => {
            void chrome.storage.local
                .remove([`script-${json.source.domain}-info-${json.source.id}`])
                .then(refreshList);
        });
        td4.appendChild(btn2);
        tr.appendChild(td4);
        table.appendChild(tr);
    });
};
const jsonProcessor = async (json: ScriptInfo) => {
    const listKey = `script-${json.source.domain}-list`;
    const myList = (await chrome.storage.local.get(listKey))?.[listKey] ??
        [];
    const transcriptKey = `script-${json.source.domain}-info-${json.source.id}`;
    const newValue = {};
    newValue[listKey] = myList.concat([transcriptKey]);
    newValue[transcriptKey] = json;
    await chrome.storage.local.set(newValue);
};
const initializeUploadButton = () => {
    const uploadElement = document.getElementById("upload");
    uploadElement.addEventListener("change", async (e) => {
        if (!(e.target instanceof HTMLInputElement))
            return;
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const text = await file.text();
        const json = JSON.parse(text);
        await jsonProcessor(json);
        await refreshList();
    });
};
const refreshDraftList = async () => {
    const storage = await chrome.storage.local.get(['draftUpdates']);
    const draftUpdates = storage.draftUpdates || {};
    showDraftList(draftUpdates);
};

const showDraftList = (draftUpdates: Record<string, { tracks: any[], metadata: any }>) => {
    const table = document.getElementById("draftList");
    const keys = Object.keys(draftUpdates);
    
    if (keys.length === 0) {
        table.innerHTML = `<tr><td colspan="7">No drafts available</td></tr>`;
        return;
    }
    
    table.innerHTML = `<tr>
        <td>Key</td>
        <td>Link</td>
        <td>Track Count</td>
        <td>Last Timestamp</td>
        <td>Export</td>
        <td>Save</td>
        <td>Delete</td>
    </tr>`;
    
    keys.forEach((key) => {
        const draft = draftUpdates[key];
        const tr = document.createElement("tr");
        
        const td0 = document.createElement("td");
        td0.textContent = key;
        tr.appendChild(td0);
        
        const tdLink = document.createElement("td");
        const linkUrl = draft.metadata?.url;
        if (linkUrl) {
            const linkAnchor = document.createElement("a");
            linkAnchor.href = linkUrl;
            linkAnchor.textContent = "Open";
            linkAnchor.target = "_blank";
            linkAnchor.rel = "noopener noreferrer";
            tdLink.appendChild(linkAnchor);
        } else {
            tdLink.textContent = "—";
        }
        tr.appendChild(tdLink);
        
        const td1 = document.createElement("td");
        td1.textContent = `${draft.tracks?.length || 0}`;
        tr.appendChild(td1);
        
        const td2 = document.createElement("td");
        if (draft.tracks && draft.tracks.length > 0) {
            td2.textContent = renderTimestamp(draft.tracks.at(-1).timestamp);
        }
        tr.appendChild(td2);
        
        const td3 = document.createElement("td");
        const exportBtn = document.createElement("button");
        exportBtn.textContent = "Export";
        exportBtn.addEventListener("click", () => {
            const exportData = {
                source: { domain: key.split('-')[1], id: key.split('-').slice(3).join('-'), url: draft.metadata?.url || "" },
                metadata: draft.metadata || {},
                scripts: [{ language: "en-US", author: draft.metadata?.author || "", tracks: draft.tracks }]
            };
            downloadTracks(`draft-${key}.json`, JSON.stringify(exportData));
        });
        td3.appendChild(exportBtn);
        tr.appendChild(td3);
        
        const td4 = document.createElement("td");
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.addEventListener("click", async () => {
            const scriptInfo: ScriptInfo = {
                source: { 
                    domain: key.split('-')[1] as any, 
                    id: key.split('-').slice(3).join('-'), 
                    url: draft.metadata?.url || "" 
                },
                metadata: draft.metadata || {},
                scripts: [{ 
                    language: draft.metadata?.language || "en-US", 
                    author: draft.metadata?.author || "", 
                    tracks: draft.tracks 
                }]
            };
            await jsonProcessor(scriptInfo);
            
            // Remove the draft
            const storage = await chrome.storage.local.get(['draftUpdates']);
            const draftUpdates = storage.draftUpdates || {};
            delete draftUpdates[key];
            await chrome.storage.local.set({ draftUpdates });
            
            await refreshList();
            await refreshDraftList();
        });
        td4.appendChild(saveBtn);
        tr.appendChild(td4);
        
        const td5 = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", async () => {
            const storage = await chrome.storage.local.get(['draftUpdates']);
            const draftUpdates = storage.draftUpdates || {};
            delete draftUpdates[key];
            await chrome.storage.local.set({ draftUpdates });
            await refreshDraftList();
        });
        td5.appendChild(deleteBtn);
        tr.appendChild(td5);
        
        table.appendChild(tr);
    });
};

const initializeDeleteAllDrafts = () => {
    const deleteAllBtn = document.getElementById("deleteAllDrafts");
    deleteAllBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete all drafts?")) {
            await chrome.storage.local.set({ draftUpdates: {} });
            await refreshDraftList();
        }
    });
};

const main = async () => {
    await refreshList();
    await refreshDraftList();
    chrome.storage.onChanged.addListener(() => {
        void refreshList();
        void refreshDraftList();
    });
    initializeUploadButton();
    initializeDeleteAllDrafts();
};
void main();

window.addEventListener("DOMContentLoaded", () => {
    const uploadLabel = document.getElementById("upload");
    uploadLabel.addEventListener("dragover", (e) => {
        e.preventDefault();
    });
    uploadLabel.addEventListener("drop", async (e) => {
        e.preventDefault();

        if(e.dataTransfer.files.length > 0){
            Array.from(e.dataTransfer.files).forEach(async (f) => {
                const text = await f.text();
                const json = JSON.parse(text);
                await jsonProcessor(json);
                await refreshList();
            });
            return;
        }

        const stringJson = e.dataTransfer.getData("text/plain");
        try {
            const json = JSON.parse(stringJson);
            console.log("Transferred: ", json);
            jsonProcessor(json).then(refreshList);
        } catch (e) {
            console.error("Dropped object is invalid", e)
        }
    });
});