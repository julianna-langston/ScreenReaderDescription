import fse from "fs-extra";
import path from "path";

const DEPLOYED_ASSETS = path.join(".", "..", "public", "assets");
const DEPLOYED_EDITOR = path.join(".", "..", "public", "editor.html");

// Clear values from /public
fse.removeSync(DEPLOYED_ASSETS);
fse.removeSync(DEPLOYED_EDITOR);

// Move built files to /public
fse.moveSync(path.join(".", "dist", "index.html"), DEPLOYED_EDITOR);
fse.moveSync(path.join(".", "dist", "assets"), DEPLOYED_ASSETS);

// Clear dist folder
fse.removeSync(path.join(".", "dist"));