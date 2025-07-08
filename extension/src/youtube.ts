import { youtubeStyle} from "./constants";
import { SRDManager } from "./SRDManager";

new SRDManager({
    generateServerPath: (id) => `https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/main/transcripts/crunchyroll/${id}.json`,
    style: youtubeStyle,
    videoSelector: "#content video",
    platformId: "youtube",
    ccContainerSelector: "#below",
    main: ({ setup, teardown }) => {
        if(location.pathname === "/watch"){
            setup(new URLSearchParams(location.search).get("v"));
        }

        document.addEventListener("yt-navigate-start", (e: any) => {
            teardown();

            if(e.detail?.pageType !== "watch"){
                return;
            }

            setup(e.detail?.endpoint?.watchEndpoint?.videoId);
        });
    }
});