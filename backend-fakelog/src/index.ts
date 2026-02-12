import * as path from "node:path";
import * as fs from "node:fs";
import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import morgan from 'morgan';
import * as process from "node:process";

const app = express();
expressWs(app);

export const WORKING_DIR = path.resolve(__dirname, '..', 'working_dir');
export const BITMAP_DIR = path.resolve(__dirname, '..', 'bitmaps');

import wsEndpoints from "./ws";
import hardwareEndpoints from "./hardware_endpoints";
import fsEndpoints from "./fs_endpoints";

function setupWorkingDir() {
    const defaultWorkingDir = path.resolve(__dirname, '..', 'working_dir_default');

    // if working_dir already exists, do nothing
    if (fs.existsSync(WORKING_DIR)) return;

    fs.cpSync(defaultWorkingDir, WORKING_DIR, {recursive: true});
}

setupWorkingDir();

app.use(cors({
  origin: true
}));

app.use(morgan('combined'));
app.use(express.json());

app.use(wsEndpoints);
app.use(hardwareEndpoints);
app.use(fsEndpoints);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Fake-log server is running on http://localhost:${PORT}`);
});
