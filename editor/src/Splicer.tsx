import { useEffect, useRef, useState } from "react";
import { convertTimestampToNumber, displayTimestamp } from "./utils";
import { ScriptInfo } from "./types";

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
      />
      
      <fieldset>
        <label>
            <input type="radio" checked={shouldAdjustTimestamp} onChange={() => setShouldAdjustTimestamp(false)} />
            Adjust timestamp to start at {timestamp}
        </label>
        <label>
            <input type="radio" checked={!shouldAdjustTimestamp} onChange={() => setShouldAdjustTimestamp(true)} />
            Preserve timestamps
        </label>
      </fieldset>

      <div className="track-display">
        <table>
          <thead>
            <tr>
              <th scope="col" aria-label="Should Splice?"></th>
              <th scope="col">Time</th>
              <th scope="col">Text</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(({ timestamp, text }, index) => (
              <tr key={index}>
                <td>
                  <input type="checkbox" checked={selected.includes(index)} onChange={() => {
                    if(selected.includes(index)){
                        setSelected(selected.toSpliced(selected.indexOf(index), 1));
                    }else{
                        setSelected(selected.concat([index]));
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
