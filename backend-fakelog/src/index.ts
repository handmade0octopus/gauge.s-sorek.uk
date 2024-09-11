import * as path from "node:path";
import * as fs from "node:fs";
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fsEndpoints from "./fs_endpoints";
import * as process from "node:process";
import hardwareEndpoints from "./hardware_endpoints";

export const WORKING_DIR = path.resolve(__dirname, '..', 'working_dir');

function setupWorkingDir() {
    const defaultWorkingDir = path.resolve(__dirname, '..', 'working_dir_default');

    // if working_dir already exists, do nothing
    if (fs.existsSync(WORKING_DIR)) return;

    fs.cpSync(defaultWorkingDir, WORKING_DIR, {recursive: true});
}

setupWorkingDir();

const app = express();

app.use(cors({
  origin: true
}));

app.use(morgan('combined'));
app.use(express.json());

app.use(hardwareEndpoints);
app.use(fsEndpoints);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Fake-log server is running on http://localhost:${PORT}`);
});
