import { defaultStyle} from "./constants";
import { SRDManager } from "./SRDManager";

let currentId = "";

new SRDManager({
    style: defaultStyle,
    videoSelector: "video",
    platformId: "crunchyroll",
    ccContainerSelector: "#velocity-player-package",
    editorListenerContainerSelector: "body",
    indicatorContainerSelector: "#velocity-controls-package",
    main: ({ setup, updateMetadata, teardown }) => {
        const starter = location.pathname.split("/")[1];
        if (starter !== "vilos-v2") {
            return;
        }
        window.addEventListener("message", (e) => {
            const data = JSON.parse(e.data);
            // console.debug("[Video Iframe] Received message: ", currentId, data);
            if (!(data.method === "loadConfig" || (data.method === "extendConfig" && data.value?.media?.metadata?.id !== currentId))) { 
                return;
            }

            teardown();
            // console.debug("[Loading metadata]", data.value.media)
            const { id, type, episode_number, series_title, title } = data.value.media?.metadata;
            currentId = id;
            setup(id);
            updateMetadata({
                url: `https://www.crunchyroll.com/watch/${id}/`,
                type: type === "episode" ? "television episode" : "movie",
                episode: episode_number,
                seriesTitle: series_title,
                title,
            });
            
        }); 
    }
});