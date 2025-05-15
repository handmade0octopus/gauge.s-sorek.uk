import {Router} from "express";
import * as fs from "node:fs";
import {BITMAP_DIR} from "./index";

const filesInBitmapDirCount = fs.readdirSync(BITMAP_DIR).length;
let currentFile = 0;
const router = Router();

router.ws('/ws', (ws, req) => {
    setInterval(() => {
        const bitmap = getBitmap();

        ws.send(bitmap);
    }, 1000);
});

function getBitmap(): Uint8Array {
    const fileNumber = currentFile++ % filesInBitmapDirCount;

    const file = fs.readFileSync(`${BITMAP_DIR}/${fileNumber}.bmp`);
    return new Uint8Array(file);
}

export default router;