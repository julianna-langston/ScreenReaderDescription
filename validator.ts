import Ajv from "ajv";
import schema from "./ScriptData.json";
import path from "path";
import fs from "fs";

const validateDirectory = (dir: string) => {
    const files = fs.readdirSync(dir);
    files.forEach((f) => {
        const file_path = path.join(dir, f);
        const stats = fs.statSync(file_path);
        if(stats.isDirectory()){
            validateDirectory(file_path);
            return;
        }

        const contents = JSON.parse(fs.readFileSync(path.join(dir, f)).toString());
        if(contents.scripts[0].author === ""){
            console.log("Unspecified author in file", f)
        }
        const isValid = validator(contents);
    
        if(!isValid){
            console.log("Error with file", f);
            console.log(validator.errors);
        }
    });
}

const ajv = new Ajv();
const validator = ajv.compile(schema);
validateDirectory(path.join(__dirname, "transcripts"));
