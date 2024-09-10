export interface ScriptData {
    source: {
        url: string;
        domain?: "youtube";
        id?: string;
    };
    metadata: {
        title: string;
        creator?: string;
        seriesTitle?: string;
        season?: number;
        episode?: number;
        type: "music video" | "television episode" | "movie" | "other";
    };
    scripts: {
        language: string;
        author: string;
        tracks: {
            text: string;
            timestamp: number;
        }[];
    }[];
}