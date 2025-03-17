const domains = ["crunchyroll", "youtube", "hidive"];
const listKeys = domains.map((str) => `script-${str}-list`);

const renderTimestamp = (seconds) => `${padNumbers(Math.floor(seconds / 60), 2)}:${padNumbers(Math.floor(seconds % 60), 2)}`;
const padNumbers = (num, padCount, text = "0") => {
    const numberLength = String(num).length;
    const paddingNeeded = padCount - numberLength;
    if (paddingNeeded <= 0) {
        return String(num);
    }
    return Array(paddingNeeded).fill(text).join("") + num;
}
const generateTitleFromMetadata = ({ type, title, creator, seriesTitle, episode, season }) => {
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
const downloadTracks = (filename, text) => {
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
            return 1;
        }
        if (left.source.domain > right.source.domain) {
            return -1;
        }
        if (left.metadata.title < right.metadata.title) {
            return 1;
        }
        if (left.metadata.title > right.metadata.title) {
            return -1;
        }
        return 0;
    });
    showList(allScripts);
};
const showList = (list) => {
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
        btn.draggable = "true";
        btn.addEventListener("click", () => downloadTracks(json.source.id + ".json", JSON.stringify(json)));
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
const jsonProcessor = async (json) => {
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
const main = async () => {
    await refreshList();
    chrome.storage.onChanged.addListener(() => void refreshList);
    initializeUploadButton();
};
void main();

window.addEventListener("DOMContentLoaded", () => {
    const uploadLabel = document.getElementById("upload");
    uploadLabel.addEventListener("dragover", (e) => {
        e.preventDefault();
    });
    uploadLabel.addEventListener("drop", async (e) => {
        e.preventDefault();

        if(e.dataTransfer.files){
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