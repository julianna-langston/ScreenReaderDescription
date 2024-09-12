import path from "path";
import fs from "fs";
import type { ScriptInfo, SupportedVideoTypes } from "./types";

type ListType = {
    id: ScriptInfo["source"]["id"];
    title: string;
};

const directory = path.join(__dirname, "transcripts");
const files = fs.readdirSync(directory);
const listing: Partial<Record<SupportedVideoTypes, Array<ListType>>> = {};

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

files.map((f) => {
    const {source, metadata}: ScriptInfo = JSON.parse(fs.readFileSync(path.join(directory, f)).toString());

    listing[metadata.type] ??= [];
    listing[metadata.type]?.push({
        id: source.id,
        title: generateTitle(metadata)
    });
});

const title = "Description Listing";

const html = `
<!doctype html>
<html>
    <head>
        <title>${title}</title>
    </head>
    <body>
        <h1>${title}</h1>
        ${Object.entries(listing).map(([type, scripts]) => {
            return `
        <h2>${type}</h2>

        <ul>
            ${toSortedByProperty<ListType>(scripts, "title").map(({id, title}) => {
                return `<li><a href="./youtube_embed.html?id=${id}">${title}</a></li>`;
            }).join("\n\t\t\t")}
        </ul>`;
        }).join("\n\n")}
    </body>
</html>
`;

fs.writeFileSync("./public/listing.html", html);