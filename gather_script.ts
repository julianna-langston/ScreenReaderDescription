import fs from "fs";
import path from "path";
import type { TCollection } from "./types";

const parseFileList = (files: string[]) => {
    let fileInfos: TCollection[] = [];
    
    for(let i = 0; i<files.length; i++){
        const fileName = files[i];
        const stat = fs.statSync(fileName);
        if(stat.isDirectory()){
            const newDirList = fs.readdirSync(fileName).map((newFilename) => path.join(fileName, newFilename));
            fileInfos = fileInfos.concat(parseFileList(newDirList));
        }else{
            const fileContents = fs.readFileSync(fileName).toString();
            try {
                const parsedJson = JSON.parse(fileContents);
                fileInfos.push({
                    ...parsedJson.source,
                    ...parsedJson.metadata,
                    filename: fileName.replace(__dirname, "")
                })
            }catch(err){
                console.error("Unable to parse json from file ", fileName);
                console.error("File contents: ", fileContents);
                console.error(err);
            }
        }
    }
    
    return fileInfos;
}

const DIRECTORY_NAME = "transcripts";
const directory = path.join(__dirname, DIRECTORY_NAME);
const collectedTranscripts =
    parseFileList(
        fs.readdirSync(directory).map((fileName) => path.join(DIRECTORY_NAME, fileName))
    )

fs.writeFileSync(path.join(__dirname, "description-list", "public", "collection.json"), JSON.stringify(collectedTranscripts));