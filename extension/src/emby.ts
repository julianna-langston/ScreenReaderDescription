import { defaultStyle } from "./constants";
import { SRDManager } from "./SRDManager";
import { waitThenAct } from "./utils";

new SRDManager({
    generateServerPath: () => ``,
    style: defaultStyle,
    videoSelector: "video",
    platformId: "emby",
    ccContainerSelector: ".htmlVideoPlayerContainer",
    editorListenerContainerSelector: "body",
    main: ({ setup }) => {
        // Wait for metadata about the video to load...
        waitThenAct(".videoOsdTitle", () => {
            const video = document.querySelector("video");
            const src = video.getAttribute("src");
            const match = src.match(/\/emby\/videos\/(\d+)\//)?.[1] ?? src.match(/^blob:https?:\/\/emby\..+\/([0-9a-zA-Z\-]{36})$/)?.[1];
            if(!match){
                return;
            }
            setup(match);
        });
    }
});