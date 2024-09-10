const tsj = require("ts-json-schema-generator");
const fs = require("fs");

const config = {
    path: "./types.d.ts",
    tsconfig: "./tsconfig.json",
    type: "ScriptInfo"
};

const outputPath = "./ScriptData.json";

const schema = tsj.createGenerator(config).createSchema(config.type);
const schemaString = JSON.stringify(schema, null, 2);
fs.writeFileSync(outputPath, schemaString);