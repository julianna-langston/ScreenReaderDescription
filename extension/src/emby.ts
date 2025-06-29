import { defaultStyle } from "./constants";
import { SRDManager } from "./SRDManager";
import { waitThenAct } from "./utils";

new SRDManager({
    generateServerPath: (id) => `https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/main/transcripts/crunchyroll/${id}.json`,
    style: defaultStyle,
    videoSelector: "video",
    platformId: "emby",
    ccContainerSelector: ".htmlVideoPlayerContainer",
    editorListenerContainerSelector: "body",
    main: ({ setup }) => {
        waitThenAct<HTMLHeadElement>(".videoOsdTitle", ({textContent}) => {
            console.log(textContent);
            setup(textContent);
        })
    }
});