import path from "path";
import fs from "fs";
import type { ScriptInfo, SupportedVideoTypes } from "./types";

type ListType = {
    id: ScriptInfo["source"]["id"];
    title: string;
};
type ListTypeList = Array<ListType>;

const directory = path.join(__dirname, "transcripts");
const files = fs.readdirSync(directory);
const listing: Partial<Record<SupportedVideoTypes, ListTypeList>> = {};
const recentlyAdded: ListTypeList = [];

function toSortedByProperty<T>(arr: T[], key: keyof T): T[]{
    // @ts-expect-error: VSCode doesn't know about Array.toSorted
    return arr.toSorted((left, right) => {
        if(left[key] < right[key]){
            return -1;
        }
        if(left[key] > right[key]){
            return 1;
        }
        return 0;
    });
}

const generateTitle = ({type, title, creator, seriesTitle, season, episode}: ScriptInfo["metadata"]) => {
    switch(type){
        case "television episode": {
            if(seriesTitle && !isNaN(+(season ?? NaN)) && !isNaN(+(episode ?? NaN))){
                return `${seriesTitle} S${season}E${episode}: ${title}`
            }
        }
        case "other": {
            if(creator){
                return `[${creator}] ${title}`;
            }
            // Explicit fall-through
        }
        case "movie": {
            // Explicit fall-through
        }
        case "music video": {
            // Explicit fall-through
        }
        default: {
            return title;
        }
    }
}

const cutOffPoint = new Date().valueOf() - (1000 * 60 * 60 * 24 * 7);   // 7 days ago

files.forEach((f) => {
    const stats = fs.statSync(path.join(directory, f));
    if(stats.isDirectory()){
        return;
    }
    const {source, metadata}: ScriptInfo = JSON.parse(fs.readFileSync(path.join(directory, f)).toString());
    
    if(metadata.draft || metadata.requiresExtension){
        return;
    }

    const metadataBundle = {
        id: source.id,
        title: generateTitle(metadata)
    };

    listing[metadata.type] ??= [];
    listing[metadata.type]?.push(metadataBundle);

    if(stats.birthtimeMs > cutOffPoint){
        recentlyAdded.push(metadataBundle);
    }
});

const title = "Description Listing";

const displayType: Record<SupportedVideoTypes, string> = {
    "movie": "Movie",
    "music video": "Music Video",
    "other": "Other",
    "television episode": "Television Episode"
};

const printListItems = (list: ListTypeList) => list.map(({id, title}) => {
    return `<li><a href="./youtube_embed.html?id=${id}">${title}</a></li>`;
}).join("\n\t\t\t");

const html = `
<!doctype html>
<html>
    <head>
        <title>${title}</title>
    </head>
    <body>
        <h1>${title}</h1>
        <h2>Recently Added</h2>

        <ul>
            ${printListItems(recentlyAdded)}
        </ul>

        ${Object.entries(listing).map(([type, scripts]) => {
            return `
        <h2>${displayType[type as SupportedVideoTypes]}</h2>

        <ul>
            ${printListItems(toSortedByProperty<ListType>(scripts, "title"))}
        </ul>`;
        }).join("\n\n")}
    </body>
</html>
`;

fs.writeFileSync("./public/listing.html", html);