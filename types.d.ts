type SupportedSourceDomains = "youtube" | "crunchyroll" | "disney" | "hidive" | "emby";
type SupportedVideoTypes = "music video" | "television episode" | "movie" | "other"

export interface ScriptInfo {
    source: ScriptSource | ScriptSource[];
    metadata: ScriptMetadata;
    scripts: ScriptData[];
}

export interface TCollection extends ScriptInfo {
    filename: string;
}

interface ScriptSource {
    url: string;
    domain: SupportedSourceDomains;
    id: string;
    offset?: number;
}

interface ScriptMetadata {
    type: SupportedVideoTypes;
    title: string;
    creator?: string;
    seriesTitle?: string;
    season?: number;
    episode?: number;
    draft?: boolean;
    requiresExtension?: boolean;
}

interface ScriptData {
    language: "en-US";
    author: string;
    explicit?: boolean;
    tracks: {
        text: string;
        timestamp: number;
    }[];
}

export type ScriptListing = {
    "languages": ScriptData["language"][];
    file: string;
} & ScriptMetadata & ScriptSource;