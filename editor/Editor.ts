import { ScriptData, ScriptMetadata, ScriptTrack, Transcript } from "../types";

type Presets = {
    author?: string;
    language?: ScriptData["language"];
    tracks?: ScriptTrack[];
    metadata?: ScriptMetadata;
}

export class Editor {
    private tracks: ScriptTrack[] = [];
    author = "";
    language: ScriptData["language"] = "en-US";
    private _metadata: ScriptMetadata = {
        type: "other",
        title: ""
    }

    private trackUpdateCallback: ((tracks: ScriptTrack[]) => void) | null = null;

    constructor(private youtubeId: string, presets: Presets = {}){
        if(presets.author){
            this.author = presets.author;
        }
        if(presets.language){
            this.language = presets.language;
        }
        if(presets.tracks){
            this.tracks = presets.tracks;
            this.trackUpdated();
        }
        if(presets.metadata){
            this._metadata = {
                ...this._metadata,
                ...presets.metadata
            };
        }
    }

    addTrack(track: ScriptTrack){
        this.tracks.push(track);
        this.trackUpdated();
    }
    
    modifyTrack(trackNumber: number, replaceTrackWith: ScriptTrack){
        this.tracks.splice(trackNumber, 1, replaceTrackWith);
        this.trackUpdated();
    }
    
    deleteTrack(trackNumber: number){
        this.tracks.splice(trackNumber, 1)
        this.trackUpdated();
    }

    private trackUpdated(){
        this.tracks.sort((a, b) => {
            if(a.timestamp < b.timestamp){
                return -1;
            }
            if(a.timestamp > b.timestamp){
                return 1;
            }
            return 0;
        });
        this.trackUpdateCallback?.(this.tracks);
    }

    generateExport(): Transcript {
        return {
            source: {
                url: `https://www.youtube.com/watch?v=${this.youtubeId}`,
                domain: "youtube",
                id: this.youtubeId
            },
            metadata: this.metadata,
            scripts: [{
                language: this.language,
                author: this.author,
                tracks: this.tracks
            }]
        }
    }

    onTrackUpdate(callback: (tracks: ScriptTrack[]) => void){
        this.trackUpdateCallback = callback;
    }

    updateMetadata(meta: Partial<ScriptMetadata>){
        this._metadata = {
            ...this._metadata,
            ...meta
        };
    }

    get metadata(){
        return this._metadata;
    }

}