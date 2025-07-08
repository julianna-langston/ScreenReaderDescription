import { ScriptData } from "../../types";

export class TranscriptManager {
  private _tracks: ScriptData["tracks"] = [];
  public onTrackChange = () => {};

  get currentTracks() {
    return this._tracks;
  }

  set currentTracks(tracks) {
    if(JSON.stringify(this._tracks) === JSON.stringify(tracks)){
        return;
    }

    // TODO: Validate non-duplicating timestamps
    this._tracks = tracks.toSorted(
      (a, b) => {
        if (a.timestamp < b.timestamp) {
          return -1;
        }
        if (a.timestamp > b.timestamp) {
          return 1;
        }
        return 0;
      }
    );

    this.onTrackChange();
  }

  addTrack(timestamp: number, text: string) {
    const newTrackList = this.currentTracks.slice(0);
    newTrackList.push({timestamp, text});
    this.currentTracks = newTrackList;
  }

  editTrack(timestamp: number, text: string){
    const newTrackList = this.currentTracks.slice(0);
    const index = newTrackList.findIndex(({timestamp: comparer}) => comparer === timestamp);
    this.currentTracks = newTrackList.toSpliced(index, 1, {text, timestamp});
  }
  
  moveTrack(timestamp: number, diff: number){
    const newTrackList = this.currentTracks;
    const index = newTrackList.findIndex(({timestamp: comparer}) => comparer === timestamp);
    this.currentTracks = newTrackList.toSpliced(index, 1, {
        text: newTrackList[index].text, 
        timestamp: timestamp + diff
    });
  }

  teardown(){
    this._tracks = [];
  }

  tracksToGo(startingSecond: number){
    return this.currentTracks.filter(({ timestamp }) => timestamp >= startingSecond)
  }

  getTrackByTimestamp(timestamp: number){
    return this.currentTracks.find(({timestamp: comparer}) => comparer === timestamp);
  }

}
