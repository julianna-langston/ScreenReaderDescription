type SupportedSourceDomains = "youtube" | "crunchyroll" | "disney" | "hidive" | "emby";
type SupportedVideoTypes = "music video" | "television episode" | "movie" | "other"

export type TCollection = ScriptSource & ScriptMetadata & {
    filename: string;
}

interface ScriptSource {
    url: string;
    domain: SupportedSourceDomains;
    id: string;
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
