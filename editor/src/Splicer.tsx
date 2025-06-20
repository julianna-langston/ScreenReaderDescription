import { useEffect, useRef, useState } from "react";
import { convertTimestampToNumber, displayTimestamp } from "./utils";
import { ScriptInfo } from "./types";

const getAnscestorOfType = (elem: HTMLElement | null, type: string): HTMLElement | null => {
  if(elem === null){
    return null;
  }
  if(elem.nodeName === type){
    return elem;
  }
  return getAnscestorOfType(elem.parentElement, type);
}

function array_unique<T>(arr: T[]){
  return [...new Set(arr)];
}

interface ScriptTrack {
  timestamp: number;
  text: string;
}
interface SplicerProps {
    timestamp: string;
  open: boolean;
  closed: () => void;
  tracksCallback: (tracks: ScriptTrack[]) => void;
}
const Splicer = ({ open, closed, tracksCallback, timestamp }: SplicerProps) => {
  const [tracks, setTracks] = useState<ScriptTrack[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [shouldAdjustTimestamp, setShouldAdjustTimestamp] = useState(true);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const doSetSelected = (arr: number[]) => {
    setSelected(array_unique(arr).toSorted((a, b) => {
      if(+a < +b){
        return -1;
      }
      if(+a > +b){
        return 1;
      }
      return 0;
    }));
  }

  useEffect(() => {
    if(open){
      dialogRef.current?.showModal();
    }
  }, [open])

  return (
    <dialog ref={dialogRef}>
      <h1>Splicer</h1>

      <button onClick={() => {
        dialogRef.current?.close();
        closed();
      }}>Close</button>

      <button onClick={() => {
        setTracks([]);
        doSetSelected([]);
      }}>Clear Tracks</button>

      <button onClick={() => {
        doSetSelected([]);
      }}>Clear selected</button>

      <input
        type="file"
        onChange={async (e) => {
          if (!(e.target instanceof HTMLInputElement)) return;
          const file = e.target.files?.[0];
          if (!file) {
            return;
          }
          const text = await file.text();
          const json = JSON.parse(text) as ScriptInfo;
          setTracks(json.scripts[0].tracks);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          if(e.dataTransfer.files){
            const text = await e.dataTransfer.files[0].text();
            const json = JSON.parse(text);
            setTracks(json.scripts[0].tracks);
            return;
          }

          const stringJson = e.dataTransfer.getData("text/plain");
          const json = JSON.parse(stringJson);
          setTracks(json.scripts[0].tracks);
        }}
      />
      
      <fieldset>
        <label>
            <input type="radio" value="adjust" checked={shouldAdjustTimestamp} onChange={() => setShouldAdjustTimestamp(true)} />
            Adjust timestamp to start at {timestamp}
        </label>
        <label>
            <input type="radio" value="preserve" checked={!shouldAdjustTimestamp} onChange={() => setShouldAdjustTimestamp(false)} />
            Preserve timestamps
        </label>
      </fieldset>

      <div className="track-display">
        <table onMouseUp={() => {
          const selection = document.getSelection();
          if(selection?.type !== "Range"){
            return;
          }
          const startIndex = Number(getAnscestorOfType(selection.anchorNode as HTMLElement, "TR")?.getAttribute("data-index"));
          const endIndex = Number(getAnscestorOfType(selection.focusNode as HTMLElement, "TR")?.getAttribute("data-index"));
          
          if(isNaN(startIndex) || isNaN(endIndex)){
            return;
          }

          const arr = [];
          const rangeLength = Math.abs(endIndex - startIndex);
          const direction = (endIndex - startIndex) < 0 ? -1 : 1;
          let cursor = startIndex;
          while(arr.length <= rangeLength){
            arr.push(cursor);
            cursor += direction;
          }

          doSetSelected(selected.concat(arr));
        }}>
          <thead>
            <tr>
              <th scope="col" aria-label="Should Splice?"></th>
              <th scope="col">Time</th>
              <th scope="col">Text</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(({ timestamp, text }, index) => (
              <tr key={index} data-index={index}>
                <td>
                  <input type="checkbox" checked={selected.includes(index)} onChange={() => {
                    if(selected.includes(index)){
                      doSetSelected(selected.toSpliced(selected.indexOf(index), 1));
                    }else{
                      doSetSelected(selected.concat([index]));
                    }
                  }} />
                </td>
                <td>{displayTimestamp(timestamp)}</td>
                <td>{text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={()=>{
        let selectedTracks = selected.map((index) => tracks[index]);
        if(shouldAdjustTimestamp){
          const baselineSeconds = convertTimestampToNumber(timestamp);
          const diff = selectedTracks[0].timestamp - baselineSeconds;
          selectedTracks = selectedTracks.map((track) => {
              return {
                  timestamp: track.timestamp - diff,
                  text: track.text
              }
          });
        }
        tracksCallback(selectedTracks);
        dialogRef.current?.close();
        closed();
      }}>Splice in {selected.length} tracks</button>
    </dialog>
  );
};

export default Splicer;
