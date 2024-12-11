type SupportedSourceDomains = "youtube" | "crunchyroll" | "disney";
type SupportedVideoTypes = "music video" | "television episode" | "movie" | "other"

export interface ScriptInfo {
    source: ScriptSource;
    metadata: ScriptMetadata;
    scripts: ScriptData[];
}

interface ScriptSource {
    url: string;
    domain: SupportedSourceDomains;
    id: string;
}

interface ScriptMetadata {
    title: string;
    creator?: string;
    seriesTitle?: string;
    season?: number;
    episode?: number;
    type: SupportedVideoTypes;
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