import { useEffect, useMemo, useState } from "react";
import {
  convertTimestampToNumber,
  displayTimestamp,
  exportContent,
  convertUrlToSource,
  validTypes,
} from "./utils";
import { ScriptInfo, SupportedVideoTypes } from "./types";
import Splicer from "./Splicer";

interface ScriptTrack {
  timestamp: number;
  text: string;
}

function pullFromStorage<T>(
  key: string,
  pullCallbackIfFound: (obj: T) => void
) {
  const stored = localStorage.getItem(key) as T;
  if (stored === null) {
    return;
  }
  pullCallbackIfFound(stored);
}

const trackSort = (a: ScriptTrack, b: ScriptTrack) => {
  if (a.timestamp < b.timestamp) {
    return -1;
  }
  if (a.timestamp > b.timestamp) {
    return 1;
  }
  return 0;
};

function App() {
  const [showSplicer, setShowSplicer] = useState(false);

  const [authorName, setAuthorName] = useState("");
  const [tracks, setTracks] = useState<Array<ScriptTrack>>([]);
  const [trackTimestamp, setTrackTimestamp] = useState("00:00");
  const [trackText, setTrackText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SupportedVideoTypes>("other");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [season, setSeason] = useState(0);
  const [episode, setEpisode] = useState(0);
  const [creator, setCreator] = useState("");

  const { id, domain } = useMemo(() => convertUrlToSource(url), [url]);
  const otherMetadata = useMemo(() => {
    switch (type) {
      case "television episode": {
        return { seriesTitle, season, episode };
      }
      default: {
        return { creator };
      }
    }
  }, [type, seriesTitle, season, episode, creator]);

  const editingMode = editingIndex !== null;

  const trackTimestampValid = true;

  const onUpload = (json: ScriptInfo) => {
    setAuthorName(json.scripts[0].author);
    setTracks(json.scripts[0].tracks);
    localStorage.setItem(
      "saved-tracks",
      JSON.stringify(json.scripts[0].tracks)
    );
    setUrl(json.source.url);
    localStorage.setItem("saved-url", json.source.url);
    setTitle(json.metadata.title);
    localStorage.setItem("saved-title", json.metadata.title);
    setType(json.metadata.type);
    localStorage.setItem("saved-type", json.metadata.type);
    if (json.metadata.type === "television episode") {
      if (json.metadata.seriesTitle) {
        setSeriesTitle(json.metadata.seriesTitle);
        localStorage.setItem("saved-seriesTitle", json.metadata.seriesTitle);
      }
      if (json.metadata.season !== undefined) {
        setSeason(json.metadata.season);
        localStorage.setItem("saved-season", String(json.metadata.season));
      }
      if (json.metadata.episode !== undefined) {
        setEpisode(json.metadata.episode);
        localStorage.setItem("saved-episode", String(json.metadata.episode));
      }
    } else {
      if (json.metadata.creator !== undefined) {
        setCreator(json.metadata.creator);
        localStorage.setItem("saved-creator", String(json.metadata.creator));
      }
    }
  };

  const onExport = (): ScriptInfo => {
    return {
      source: {
        url,
        domain,
        id,
      },
      metadata: {
        type,
        title,
        ...otherMetadata,
      },
      scripts: [
        {
          language: "en-US",
          author: authorName,
          tracks,
        },
      ],
    };
  };

  const onSubmit = () => {
    const newTracksValue = editingMode
      ? tracks.toSpliced(editingIndex, 1, {
          text: trackText,
          timestamp: convertTimestampToNumber(trackTimestamp),
        })
      : tracks
          .concat([
            {
              text: trackText,
              timestamp: convertTimestampToNumber(trackTimestamp),
            },
          ])
          .toSorted(trackSort);

    setTracks(newTracksValue);
    localStorage.setItem("saved-tracks", JSON.stringify(newTracksValue));
    onCancel();
  };

  const onCancel = () => {
    setTrackText("");
    setEditingIndex(null);
  };

  const onDelete = () => {
    if (editingIndex === null) {
      console.warn("onDelete called when out of editingMode");
      return;
    }

    const newTracksValue = tracks.toSpliced(editingIndex, 1);
    setTracks(newTracksValue);
    localStorage.setItem("saved-tracks", JSON.stringify(newTracksValue));
    onCancel();
  };

  const focusOnTimestamp = (index: number) => {
    setTrackTimestamp(displayTimestamp(tracks[index].timestamp));
    setTrackText(tracks[index].text);
    setEditingIndex(index);
  };


  useEffect(() => {
    pullFromStorage<string>("saved-tracks", (saved) =>
      setTracks(JSON.parse(saved))
    );
    pullFromStorage<string>("saved-url", (saved) => setUrl(saved));
    pullFromStorage<SupportedVideoTypes>("saved-type", (saved) =>
      setType(saved)
    );
    pullFromStorage<string>("saved-title", (saved) => setTitle(saved));
    pullFromStorage<string>("saved-seriesTitle", (saved) =>
      setSeriesTitle(saved)
    );
    pullFromStorage<string>("saved-season", (saved) => setSeason(+saved));
    pullFromStorage<string>("saved-episode", (saved) => setEpisode(+saved));
    pullFromStorage<string>("saved-author", (saved) => setAuthorName(saved));
  }, []);

  return (
    <>
      <h1>Editor</h1>

      <div className="script-info">
        <label>
          Author name:
          <input
            id="author-name"
            type="text"
            value={authorName}
            onChange={(e) => {
              localStorage.setItem("saved-author", e.target.value);
              setAuthorName(e.target.value)}
            }
          />
        </label>

        <label>
          Script language:
          <input
            type="text"
            value={"en-US"}
            readOnly
          />
        </label>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: "4px",
            marginTop: "4px",
          }}
        >
          <span>{tracks.length}</span>
          <button
            onClick={() => {
              if (confirm("Are you sure?")) {
                setTracks([]);
                localStorage.removeItem("saved-tracks");
                setTrackTimestamp("00:00");
                setUrl("");
                localStorage.removeItem("saved-url");
                setTitle("");
                localStorage.removeItem("saved-title");
                setSeason(0);
                localStorage.removeItem("saved-season");
                setEpisode(0);
                localStorage.removeItem("saved-episode");
                setSeriesTitle("");
                localStorage.removeItem("saved-seriesTitle");
                setCreator("");
                localStorage.removeItem("saved-creator");
              }
            }}
          >
            Reset
          </button>
          <button onClick={() => setShowSplicer(true)}>Splice</button>
          <button
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();

              if(e.dataTransfer.files){
                  Array.from(e.dataTransfer.files).forEach(async (f) => {
                      const text = await f.text();
                      const json = JSON.parse(text);
                      onUpload(json);
                  });
                  return;
              }

              const stringJson = e.dataTransfer.getData("text/plain");
              try {
                const newJson = JSON.parse(stringJson);
                onUpload(newJson);
              } catch (e) {
                console.error("Dropped object is invalid", stringJson);
              }
            }}
          >
            Upload
          </button>
          <button
            id="export"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", JSON.stringify(onExport()));
              e.dataTransfer.dropEffect = "copy";
            }}
            onClick={() =>
              exportContent(`${id}.json`, JSON.stringify(onExport()))
            }
          >
            Export
          </button>
        </div>
      </div>

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
                  <button
                    onClick={() => focusOnTimestamp(index)}
                    className="time"
                  >
                    {displayTimestamp(timestamp)}
                  </button>
                </td>
                <td>{text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="editor-container">
        <div id="track-editor" className="editor">
          <label>
            Timestamp:
            <input
              id="track-timestamp"
              type="text"
              aria-invalid={!trackTimestampValid}
              value={trackTimestamp}
              onChange={(e) => setTrackTimestamp(e.target.value)}
            />
          </label>

          <label>
            Text:
            <input
              id="track-text"
              type="text"
              value={trackText}
              onChange={(e) => setTrackText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmit();
                }
              }}
            />
          </label>

          <button onClick={onSubmit}>Submit</button>
          {editingMode && (
            <div>
              <button onClick={onDelete}>Delete</button>
              <button onClick={onCancel}>Cancel</button>
            </div>
          )}
        </div>

        <div id="metadata-editor" className="editor">
          <label>
            URL
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                localStorage.setItem("saved-url", e.target.value);
              }}
            />
          </label>

          <label>
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SupportedVideoTypes)}
            >
              {Object.entries(validTypes).map(([id, displayName]) => (
                <option key={id} value={id}>
                  {displayName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                localStorage.setItem("saved-title", e.target.value);
              }}
            />
          </label>

          {type === "television episode" && (
            <label>
              Series Title
              <input
                type="text"
                value={seriesTitle}
                onChange={(e) => {
                  setSeriesTitle(e.target.value);
                  localStorage.setItem("saved-seriesTitle", e.target.value);
                }}
              />
            </label>
          )}

          {type === "television episode" && (
            <label>
              Season
              <input
                type="number"
                value={season}
                onChange={(e) => {
                  setSeason(+e.target.value);
                  localStorage.setItem("saved-season", e.target.value);
                }}
              />
            </label>
          )}

          {type === "television episode" && (
            <label>
              Episode
              <input
                type="number"
                value={episode}
                onChange={(e) => {
                  setEpisode(+e.target.value);
                  localStorage.setItem("saved-episode", e.target.value);
                }}
              />
            </label>
          )}

          {type !== "television episode" && (
            <label>
              Creator
              <input
                type="text"
                value={creator}
                onChange={(e) => {
                  setCreator(e.target.value);
                  localStorage.setItem("saved-creator", e.target.value);
                }}
              />
            </label>
          )}
        </div>
      </div>

      <Splicer
        timestamp={trackTimestamp}
        open={showSplicer}
        closed={() => setShowSplicer(false)}
        tracksCallback={(addedTracks) => {
          const newTracks = tracks.concat(addedTracks).toSorted(trackSort);
          setTracks(newTracks);
        }}
      />
    </>
  );
}

export default App;
