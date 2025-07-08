import { defaultStyle} from "./constants";
import { SRDManager } from "./SRDManager";

new SRDManager({
    generateServerPath: (id) => `https://raw.githubusercontent.com/julianna-langston/ScreenReaderDescription/main/transcripts/disney/${id}.json`,
    style: defaultStyle,
    videoSelector: "video",
    platformId: "disney",
    ccContainerSelector: ".btm-media-player",
    main: ({ setup }) => {
        const [, page, id] = location.pathname.split("/");

        if (page !== "play") {
            return;
        }
        
        setup(id);
    }
});