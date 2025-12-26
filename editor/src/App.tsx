import { useEffect, useMemo, useRef, useState } from "react";
import {
  convertTimestampToNumber,
  displayTimestamp,
  exportContent,
  convertUrlToSource,
  validTypes,
  pullFromStorage,
  trackSort,
  generateExportFilename,
  type ScriptTrack
} from "./utils";
import { ScriptInfo, SupportedVideoTypes } from "./types";
import Splicer from "./Splicer";

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
  const [seasonCheckbox, setSeasonCheckbox] = useState(true);
  const [episode, setEpisode] = useState(0);
  const [creator, setCreator] = useState("");
  const [lastTouchedTimestamp, setLastTouchedTimestamp] = useState(-1);
  const [videoId, setVideoId] = useState("");
  const editorDisplay = useRef<HTMLDivElement | null>(null);

  const { id, domain } = useMemo(() => convertUrlToSource(url), [url]);
  const otherMetadata = useMemo(() => {
    switch (type) {
      case "television episode": {
        const metadata: { seriesTitle: string; season?: number; episode: number } = { seriesTitle, episode };
        if (seasonCheckbox) {
          metadata.season = season;
        }
        return metadata;
      }
      default: {
        return { creator };
      }
    }
  }, [type, seriesTitle, season, episode, creator, seasonCheckbox]);
  const shouldShowId = useMemo(() => url.includes("emby."), [url]);

  const editingMode = editingIndex !== null;

  const trackTimestampValid = true;

  const onUpload = (json: ScriptInfo) => {
    setAuthorName(json.scripts[0].author);
    setTracks(json.scripts[0].tracks);
    localStorage.setItem(
      "saved-tracks",
      JSON.stringify(json.scripts[0].tracks)
    );
    sendTrackUpdate(json.scripts[0].tracks)
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
        id: shouldShowId ? videoId : id
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
    if(trackText === ""){
      return;
    }
    const numTimestamp = convertTimestampToNumber(trackTimestamp);
    const newTracksValue = editingMode
      ? tracks.toSpliced(editingIndex, 1, {
          text: trackText,
          timestamp: numTimestamp,
        }).toSorted(trackSort)
      : tracks
          .concat([
            {
              text: trackText,
              timestamp: numTimestamp,
            },
          ])
          .toSorted(trackSort);

    setTracks(newTracksValue);
    localStorage.setItem("saved-tracks", JSON.stringify(newTracksValue));
    sendTrackUpdate(newTracksValue);
    onCancel();
    setLastTouchedTimestamp(numTimestamp);
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
    sendTrackUpdate(newTracksValue);
    onCancel();
  };

  const sendTrackUpdate = (newTracksValue: ScriptTrack[]) => {
    document.dispatchEvent(new CustomEvent("ScreenReaderDescription-Track-Update", {detail: {tracks: newTracksValue}}));
  };

  const focusOnTimestamp = (index: number) => {
    setTrackTimestamp(displayTimestamp(tracks[index].timestamp));
    setTrackText(tracks[index].text);
    setEditingIndex(index);
  };

  const maybeAddNewTracks = (newTracks: ScriptTrack[], lastTouched: number) => {
    if(JSON.stringify(newTracks) === JSON.stringify(tracks)){
      return;
    }
    console.debug("Old Tracks", tracks, "New tracks: ", newTracks)
    if(Math.abs(tracks.length - newTracks.length) > 1){
      console.log("Diff over 1", tracks.length, newTracks.length)
    //   if(!confirm(`The SRD Extension is trying to update multiple tracks. This change will replace the current ${tracks.length} tracks with ${newTracks.length}. Continue?`)){
    //     return
    //   }
    }
    setTracks(newTracks);
    localStorage.setItem("saved-tracks", JSON.stringify(newTracks));
    setLastTouchedTimestamp(lastTouched)
  }

  const handleIncomingTracks = (e: CustomEvent) => {
    const {tracks, lastTouched} = e.detail;
    maybeAddNewTracks(tracks, lastTouched)
  }

  useEffect(() => {
    let bridgeReady = false;
    let pendingTracks: ScriptTrack[] | null = null;

    // Wait for bridge to be ready
    const handleBridgeReady = () => {
      bridgeReady = true;
      if (pendingTracks) {
        sendTrackUpdate(pendingTracks); 
        pendingTracks = null;
      }
      document.removeEventListener("ScreenReaderDescription-Bridge-Ready", handleBridgeReady);
    };

    document.addEventListener("ScreenReaderDescription-Bridge-Ready", handleBridgeReady);
    if(document.body.hasAttribute("data-editor-bridge-ready")){
      bridgeReady = true;
    }

    pullFromStorage<string>("saved-tracks", (saved) =>{
      const pulledTracks = JSON.parse(saved) as ScriptTrack[];
      const validTracks = pulledTracks.filter((track) => track !== null && "text" in track && "timestamp" in track);
      console.debug("Pulled tracks: ", pulledTracks, "Valid tracks: ", validTracks)
      setTracks(validTracks);
      if (bridgeReady) {
        sendTrackUpdate(validTracks);
      } else {
        pendingTracks = validTracks;
      }
    });
    pullFromStorage<string>("saved-url", (saved) => setUrl(saved));
    pullFromStorage<SupportedVideoTypes>("saved-type", (saved) =>
      setType(saved)
    );
    pullFromStorage<string>("saved-title", (saved) => setTitle(saved));
    pullFromStorage<string>("saved-seriesTitle", (saved) =>
      setSeriesTitle(saved)
    );
    pullFromStorage<string>("saved-season", (saved) => setSeason(+saved));
    pullFromStorage<string>("saved-seasonCheckbox", (saved) => setSeasonCheckbox(saved === "true"));
    pullFromStorage<string>("saved-episode", (saved) => setEpisode(+saved));
    pullFromStorage<string>("saved-author", (saved) => setAuthorName(saved));

    // @ts-expect-error
    document.addEventListener("ScreenReaderDescription-Track-Update-From-Player", handleIncomingTracks);

    // @ts-expect-error
    document.addEventListener("ScreenReaderDescription-announce-id", (e: CustomEvent) => {
      let idToUse = shouldShowId ? videoId : e.detail.id;
      if(idToUse !== e.detail.id){
        setVideoId(e.detail.id);
      }
    });

    // Cleanup function
    return () => {
      document.removeEventListener("ScreenReaderDescription-Bridge-Ready", handleBridgeReady);
    };
  }, []);

  useEffect(() => {
    let idToUse = shouldShowId ? videoId : id;
    if (idToUse) {
      document.dispatchEvent(
        new CustomEvent("ScreenReaderDescription-video-id-update", {
          detail: { id: idToUse }
        })
      );
    }
  }, [videoId, url])

  useEffect(() => {
    setTimeout(() => {
      editorDisplay?.current?.querySelector("[data-lasttouched='true']")?.scrollIntoView();
    }, 50);
  }, [tracks, lastTouchedTimestamp]);

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

        <div id="editor-top" role="toolbar">
          <span>{tracks.length}</span>
          <button onClick={() => {
            if(!confirm("Are you sure?")){
              return;
            }
            setTracks([]);
            localStorage.removeItem("saved-tracks");
          }}>Clear tracks</button>
          <button onClick={() => {
            if(!confirm("Are you sure?")){
              return;
            }
            setTracks([]);
            localStorage.removeItem("saved-tracks");
            setTrackTimestamp("00:00");
            setUrl("");
            localStorage.removeItem("saved-url");
            setTitle("");
            localStorage.removeItem("saved-title");
            setEpisode(episode+1);
            localStorage.setItem("saved-episode", String(episode+1));
          }}>
            Next Episode
          </button>
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
                setSeasonCheckbox(false);
                localStorage.removeItem("saved-seasonCheckbox");
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
          <div
            style={{
              border: "1px dashed black",
              borderRadius: "2px",
              padding: "0 2px",
              backgroundColor: "rgb(240,240,240)",
            }}
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
            Drop Script
          </div>
          <button
            id="export"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", JSON.stringify(onExport()));
              e.dataTransfer.dropEffect = "copy";
            }}
            onClick={() => {
              const exportData = onExport();
              const filename = generateExportFilename(exportData.metadata);
              exportContent(filename, JSON.stringify(exportData));
            }}
          >
            Export
          </button>
        </div>
      </div>

      <div className="track-display" ref={editorDisplay}>
        <table>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Text</th>
              <th scope="col">Tools</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(({ timestamp, text }, index) => (
              <tr key={index} data-lasttouched={timestamp === lastTouchedTimestamp}>
                <td>
                  <button
                    onClick={() => focusOnTimestamp(index)}
                    className="time"
                  >
                    {displayTimestamp(timestamp)}
                  </button>
                </td>
                <td>{text}</td>
                {index > 0 && <td>
                    <button
                      onClick={() => {
                        const currentTimestamp = tracks[index].timestamp;
                        const previousTimestamp = tracks[index - 1].timestamp;
                        const timeDifference = currentTimestamp - previousTimestamp;
                        
                        // Check if current row's timestamp is more than 10 seconds after previous row
                        if (timeDifference > 10) {
                          if (!confirm("Are you sure? The current row is more than 10 seconds after the previous row.")) {
                            return;
                          }
                        }
                        
                        const newTracks = [...tracks];
                        // Concatenate current row's text to previous row's text
                        newTracks[index - 1].text += " " + newTracks[index].text;
                        // Remove the current row
                        newTracks.splice(index, 1);

                        console.debug("New tracks: ", newTracks)
                        
                        setTracks(newTracks);
                        localStorage.setItem("saved-tracks", JSON.stringify(newTracks));
                        sendTrackUpdate(newTracks);
                      }}
                  >
                    Push
                  </button>
                </td>}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmit();
                }
              }}
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
              id="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                localStorage.setItem("saved-url", e.target.value);
              }}
            />
            <button
              onClick={() => {
                if (url) {
                  window.open(url, '_blank');
                }
              }}
              disabled={!url}
            >
              Open
            </button>
          </label>

          {shouldShowId && <label>
            ID
            <input type="text" id="videoId" value={videoId} onChange={(e) => {
              setVideoId(e.target.value);
            }} />
          </label>}

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
                  type="checkbox"
                  checked={seasonCheckbox}
                  onChange={(e) => {
                    setSeasonCheckbox(e.target.checked);
                    localStorage.setItem("saved-seasonCheckbox", String(e.target.checked));
                  }}
                />
               {(seasonCheckbox && <input
                  type="number"
                  value={season}
                  onChange={(e) => {
                    setSeason(+e.target.value);
                    localStorage.setItem("saved-season", e.target.value);
                  }}
                />)}
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
          console.debug("tracks", tracks, "Added tracks: ", addedTracks)
          const newTracks = tracks.concat(addedTracks).toSorted(trackSort);
          console.debug("New tracks: ", newTracks)
          setTracks(newTracks);
          localStorage.setItem("saved-tracks", JSON.stringify(newTracks));
          sendTrackUpdate(newTracks);
        }}
      />
    </>
  );
}

export default App;
