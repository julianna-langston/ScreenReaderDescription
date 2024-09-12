import path from "path";
import fs from "fs";
import type { ScriptInfo } from "./types";

const directory = path.join(__dirname, "transcripts");
const files = fs.readdirSync(directory);
const listing = files.map((f) => {
    const contents: ScriptInfo = JSON.parse(fs.readFileSync(path.join(directory, f)).toString());

    return {
        ...contents.source,
        ...contents.metadata,
        file: `scripts/${f}`,
        languages: contents.scripts.map(({language}) => language)
    };
});

fs.writeFileSync("./listing.json", JSON.stringify(listing));
console.log("Done");