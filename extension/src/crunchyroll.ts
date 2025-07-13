import { defaultStyle} from "./constants";
import { SRDManager } from "./SRDManager";

new SRDManager({
    style: defaultStyle,
    videoSelector: "video",
    platformId: "crunchyroll",
    ccContainerSelector: "#velocity-player-package",
    editorListenerContainerSelector: "body",
    indicatorContainerSelector: "#vilosControlsContainer",
    main: ({ setup }) => {
        console.log("Checking page...");
        const starter = location.pathname.split("/")[1];
        if (starter !== "vilos-v2") {
            return;
        }
        window.addEventListener("message", (e) => {
            const data = JSON.parse(e.data);
            console.debug("[Video Iframe] Received message: ", data);
            if (data.method !== "loadConfig") {
                return;
            }
            const { id } = data.value.media.metadata;
            setup(id);
        });
    }
});