import { displayTimestamp } from "./utils";
interface ScriptTrack {
  timestamp: number;
  text: string;
}

interface TrackDisplayProps {
  tracks: ScriptTrack[];
  timestampCallback?: (index: number) => void;
}

const App = ({ tracks, timestampCallback }: TrackDisplayProps) => {
  return (
    <div className="track-display">
      <table>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Text</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map(({ timestamp, text }, index) => (
            <tr key={index}>
              <td>
                {timestampCallback ?
                    <button
                    onClick={() => timestampCallback(index)}
                    className="time"
                    >
                    {displayTimestamp(timestamp)}
                    </button>
                    : displayTimestamp(timestamp)
                }
              </td>
              <td>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
