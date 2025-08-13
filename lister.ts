import path from "path";
import fs from "fs";
import type { ScriptInfo, SupportedVideoTypes } from "./types";

const generateYoutubeListing = () => {
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
}
generateYoutubeListing();

/*** CRUNCHYROLL ***/

const generateCrunchyrollListing = () => {
    type Listing = {
        url: string;
        episode: number;
        title: string;
    }
    

    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "generated-transcript-catalog.json")).toString());
    const keys = Object.keys(catalog)
    const crunchyrollKeys = keys.filter((key) => key.startsWith("crunchyroll-"));
    console.log(crunchyrollKeys)
    
    const show = new Map<string, Listing[]>();
    crunchyrollKeys.forEach((key) => {
        const fileName = catalog[key]
        console.log(fileName);
        const {source, metadata}: ScriptInfo = JSON.parse(fs.readFileSync(path.join(__dirname, fileName)).toString());
        const {seriesTitle, episode, title, draft} = metadata;
        if(draft || !seriesTitle){
            return;
        }
        const showList: Listing[] = show.get(seriesTitle) ?? [];
        showList.push({
            url: source.url,
            episode: Number(episode),
            title
        });
    
        show.set(seriesTitle, showList);
    })

    const entries = Array.from(show.entries());
    entries.sort((a, b) => {
        if(a[0] > b[0]){
            return 1;
        }
        if(a[0] < b[0]){
            return -1;
        }
        return 0;
    });
    const title = "Described Videos on Crunchyroll";
    const html = `
    <!doctype html>
    <html>
        <head>
            <title>${title}</title>
        </head>
        <body>
            <h1>${title}</h1>

            <p>
                The Screen Reader Description project includes descriptions for videos streaming on various sites. While some sites, like youtube, can be hosted on this website, sites like Crunchyroll can't.
                While the project maintains descriptions for several shows on Crunchyroll, you will have to download the project's <a href="https://chromewebstore.google.com/detail/screen-reader-description/mheldpckofmhbfadbafiohnpgfphopjk">Chrome Extension</a> in order to watch the shows with descriptions.
            </p>

            <p>
                Once you install the <a href="https://chromewebstore.google.com/detail/screen-reader-description/mheldpckofmhbfadbafiohnpgfphopjk">Chrome Extension</a>, you can visit any of the links below. As long as the extension is installed and you are running a screen reader, the description should play immediately.
            </p>

            <p>
                Not all shows have been fully described. If you are interested in more episodes, or for more shows, please reach out on <a href="https://github.com/julianna-langston/ScreenReaderDescription">GitHub</a>.
            </p>

            ${entries.map(([seriesTitle, episodes]) => {
                episodes.sort((a, b) => {
                    if(a.episode > b.episode){
                        return 1;
                    }
                    if(a.episode < b.episode){
                        return -1;
                    }
                    return 0;
                });
                return `
            <h2>${seriesTitle}</h2>

            <ol>
                ${episodes.map(({episode, title, url}) => `<li value="${episode}"><a href="${url}">${title}</a></li>`).join("\n")}
            </ol>
            `;
            }).join("")}
        </body>
    </html>`;

    fs.writeFileSync("./public/crunchyroll.html", html);
}

generateCrunchyrollListing();