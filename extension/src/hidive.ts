import { defaultStyle} from "./constants";
import { SRDManager } from "./SRDManager";

new SRDManager({
    style: defaultStyle,
    videoSelector: "video",
    platformId: "hidive",
    ccContainerSelector: ".app-container",
    main: ({ setup }) => {
        const path = location.pathname.split("/");
        console.log("Checking path...", path);
        if(path[1] !== "video"){
            return;
        }

        const id = path[2];
        setup(id);
    }
});