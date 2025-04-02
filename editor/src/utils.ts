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
  const seconds = (num % 60);
  const minutes = Math.floor(num / 60);
  return `${padNumbers(minutes)}:${padNumbers(seconds)}`.match(/(\d{2}:\d{2}\.?[1-9]*)/)?.[1] ?? "00:00";
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

const matcher: Partial<Record<ScriptSource["domain"], RegExp>> = {
  hidive: /^https:\/\/www.hidive.com\/video\/(\d+)/,
  youtube: /^https:\/\/www.youtube.com\/watch\?v=([\w\d\-]+)/,
  crunchyroll: /^https:\/\/www.crunchyroll.com\/watch\/([\w\d]+)\//,
}

export const convertUrlToSource = (url: string): ScriptSource => {
  const domains = Object.keys(matcher) as ScriptSource["domain"][];
  for(let i = 0; i<domains.length; i++){
    const domain = domains[i];
    const match = matcher[domain];
    if(!match){
      continue;
    }
    const tester = url.match(match);
    if(tester === null){
      continue;
    }

    return {
      url,
      id: tester[1],
      domain
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


export class LocalStorageMock {
  private store: Record<string, string>;
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index: number) {
    return Object.keys(this.store)[index];
  }
}