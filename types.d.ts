export interface ScriptInfo {
    source: ScriptSource;
    metadata: ScriptMetadata;
    scripts: ScriptData[];
}

interface ScriptSource {
    url: string;
    domain?: "youtube";
    id?: string;
}

interface ScriptMetadata {
    title: string;
    creator?: string;
    seriesTitle?: string;
    season?: number;
    episode?: number;
    type: "music video" | "television episode" | "movie" | "other";
}

interface ScriptData {
    language: HTMLElement["lang"];
    author: string;
    tracks: {
        text: string;
        timestamp: number;
    }[];
}

export type ScriptListing = {
    "languages": ScriptData["language"][];
    file: string;
} & ScriptMetadata & ScriptSource;