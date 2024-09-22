import Ajv from "ajv";
import schema from "./ScriptData.json";
import path from "path";
import fs from "fs";

const ajv = new Ajv();
const validator = ajv.compile(schema);
const directory = path.join(__dirname, "transcripts");
const files = fs.readdirSync(directory);
files.forEach((f) => {
    const contents = JSON.parse(fs.readFileSync(path.join(directory, f)).toString());
    if(contents.scripts[0].author === ""){
        console.log("Unspecified author in file", f)
    }
    const isValid = validator(contents);

    if(!isValid){
        console.log("Error with file", f);
        console.log(validator.errors);
    }
});
