import { ScriptData, ScriptMetadata, ScriptTrack, Transcript } from "../types";

const MAXIMUM_TIME_TO_DISPLAY = (3600*99) + (59*60) + 59;

const padTen = (num: number) => {
    if(num < 10){
        return `0${num}`;
    }
    return `${num}`;
}


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

    public static displaySeconds(seconds: number){
        if(seconds <= 0){
            return `0:00`
        }
        if(seconds < 60) {
            return `0:${padTen(Math.floor(seconds))}`;
        }
        if(seconds < 3600){
            return `${Math.floor(seconds/60)}:${padTen(Math.floor(seconds % 60))}`
        }
        if(seconds < MAXIMUM_TIME_TO_DISPLAY){
            return `${Math.floor(seconds/3600)}:${padTen(Math.floor((seconds % 3600)/60))}:${padTen(Math.floor(seconds % 60))}`
        }
        return `99:59:59`

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