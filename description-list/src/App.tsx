import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { type TCollection } from './types'
import './App.css'

type SeriesInfo = Record<string, {
  [season: string]: {
    [episode: string]: {
      title: string;
      url: string;
    }
  }
}>

const summarizeList = (providedArray: number[]) => {
  const arr = providedArray.toSorted((a, b) => {
    if(+a > +b){
      return 1;
    }
    if(+a < +b){
      return -1;
    }
    return 0;
  });
  if(arr.length === 0){
    return "";
  }

  let range: Array<{start: number; end: number}> = [{
    start: arr[0],
    end: arr[0]
  }];

  arr.slice(1).forEach((num) => {
    for(let i=0; i<range.length; i++){
      let {start, end} = range[i];
      if(num >= start && num <= end){
        return;
      }
      if(num === start-1){
        range[i].start = start-1;
        return;
      }
      if(num === end+1){
        range[i].end = end+1;
        return;
      }
    }
    range.push({
      start: num,
      end: num
    });
  });

  const result = range.map(({start, end}) => {
    if(start === end){
      return String(start);
    }
    return `${start} - ${end}`
  }).join(", ");

  return result;
}

const PopUp = ({title, children, defaultExpanded = false}: PropsWithChildren<{title: string; defaultExpanded?: boolean}>) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return(
    <div>
      <span onClick={() => setExpanded(!expanded)}>
        {title}
      </span>
      <div style={{display: expanded ? "block" : "none"}}>
        {children}
      </div>
    </div>
  )
}

function App() {
  const [files, setFiles] = useState<TCollection[]>([]);

  const series = useMemo<SeriesInfo>(() => {
    let seriesList: SeriesInfo = {};
    files.forEach(({seriesTitle, season = 0, episode = 0, title, url}) => {
      if(!seriesTitle){
        return;
      }
      seriesList[seriesTitle] ??= {};
      seriesList[seriesTitle][season] ??= {};
      seriesList[seriesTitle][season][episode] ??= {
        title,
        url
      };
    });
    return seriesList;
  }, [files]);

  const grabData = async () => {
    const response = await fetch("/collection.json");
    const fileContents = await response.text();
    const json = JSON.parse(fileContents) as TCollection[];
    setFiles(json);
  }

  useEffect(() => {
    void grabData();
  }, []);

  return (
    <>
      <h1>Available Descriptions</h1>

      <h2>Television Episodes</h2>

      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Title</th>
            <th>Episodes Described</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(series).map((title) => <tr key={title}>
            <td>
              {files.find(({seriesTitle}) => seriesTitle === title)?.domain}
            </td>
            <td>
            <PopUp title={title}>
              <div>
                {Object.keys(series[title]).map((seasonNumber) => <div key={seasonNumber}>
                  Season {seasonNumber}
                  <ol>
                    {Object.entries(series[title][seasonNumber]).map(([episodeNumber, {title, url}]) => <li key={episodeNumber} value={episodeNumber}><a href={url}>{title}</a></li>)}
                  </ol>
                </div>)}
              </div>
            </PopUp>
            </td>
            <td>
              {Object.entries(series[title]).map(([num, season]) => <div key={num}>Season {num}: {summarizeList(Object.keys(season).map((str) => +str))}</div>)}
            </td>
          </tr>)}
        </tbody>
      </table>
    </>
  )
}

export default App
