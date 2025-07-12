import { ScriptData } from "../../types";

export class TranscriptManager {
  private _tracks: ScriptData["tracks"] = [];
  public lastTouchedTimestamp = -1;
  public onTrackChange = () => {};
  public onSaveData: ((data: any) => void) | null = null;

  get currentTracks() {
    return this._tracks;
  }

  set currentTracks(tracks) {
    if(JSON.stringify(this._tracks) === JSON.stringify(tracks)){
        return;
    }

    // Save data through callback if available
    if (this.onSaveData) {
      this.onSaveData({
        tracks: tracks.toSorted(
          (a, b) => {
            if (a.timestamp < b.timestamp) {
              return -1;
            }
            if (a.timestamp > b.timestamp) {
              return 1;
            }
            return 0;
          }
        ),
        lastTouched: this.lastTouchedTimestamp,
        timestamp: Date.now()
      });
    }else{
      this._tracks = tracks;
    }

    this.onTrackChange();
  }

  addTrack(timestamp: number, text: string) {
    const newTrackList = this.currentTracks.slice(0);
    newTrackList.push({timestamp, text});
    this.lastTouchedTimestamp = timestamp;
    this.currentTracks = newTrackList;
  }
  
  editTrack(timestamp: number, text: string){
    const newTrackList = this.currentTracks.slice(0);
    const index = newTrackList.findIndex(({timestamp: comparer}) => comparer === timestamp);
    this.lastTouchedTimestamp = timestamp;
    this.currentTracks = newTrackList.toSpliced(index, 1, {text, timestamp});
  }
  
  moveTrack(timestamp: number, diff: number){
    const newTrackList = this.currentTracks;
    const index = newTrackList.findIndex(({timestamp: comparer}) => comparer === timestamp);
    const newTimestamp = timestamp + diff;
    this.lastTouchedTimestamp = timestamp;
    this.currentTracks = newTrackList.toSpliced(index, 1, {
        text: newTrackList[index].text, 
        timestamp: newTimestamp
    });
    return newTimestamp;
  }

  teardown(){
    this._tracks = [];
  }

  loadData(data: ScriptData["tracks"]) { 
    this._tracks = data;
    this.onTrackChange();
  }

  tracksToGo(startingSecond: number){
    return this.currentTracks.filter(({ timestamp }) => timestamp >= startingSecond)
  }

  getTrackByTimestamp(timestamp: number){
    return this.currentTracks.find(({timestamp: comparer}) => comparer === timestamp);
  }

}
