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
        waitThenAct<HTMLHeadElement>(".videoOsdTitle", ({textContent}) => {
            setup(textContent);
        })
    }
});