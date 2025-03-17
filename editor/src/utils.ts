import { ScriptSource } from './types';

export const convertTimestampToNumber = (timestamp: string) => {
  const [minutes, seconds] = timestamp.split(":");
  const result = Number(minutes) * 60 + Number(seconds);
  return result;
};

const padNumbers = (num: number) => {
  if (num < 10) {
    return `0${num}`;
  }
  return `${num}`;
};

export const displayTimestamp = (num: number) => {
  const seconds = num % 60;
  const minutes = Math.floor(num / 60);
  return `${padNumbers(minutes)}:${padNumbers(seconds)}`;
};

export const validDomains = {
  youtube: "YouTube",
  crunchyroll: "Crunchyroll",
  disney: "Disney+",
  hidive: "HIDIVE"
};

export const validTypes = {
  movie: "Movie",
  "television episode": "TV episode",
  "music video": "Music video",
  "other": "Other"
}

export const exportContent = (filename: string, text: string) => {
  const element = document.createElement("a");
  element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}


export const convertUrlToSource = (url: string): ScriptSource => {
  const hidiveMatcher = url.match(/^https:\/\/www.hidive.com\/video\/(\d+)/);
  if(hidiveMatcher !== null){
    return {
      url,
      id: hidiveMatcher[1],
      domain: "hidive"
    }
  }
  const youtubeMatcher = url.match(/^https:\/\/www.youtube.com\/watch\?v=([\w\d\-]+)/)
  if(youtubeMatcher !== null){
    return {
      url,
      id: youtubeMatcher[1],
      domain: "youtube"
    }
  }

  return {
    url,
    id: "",
    domain: "youtube"
  }
}

export function isObject(item: unknown) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function mergeDeep(target: any, ...sources: any[]) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}