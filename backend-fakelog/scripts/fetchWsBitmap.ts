import * as fs from "node:fs";
import * as path from "node:path";

const hostName = '172.20.10.4'
const wsUrl = `ws://${hostName}/ws`;

const bitmapDestinationDir = path.resolve(__dirname, '..', 'bitmaps');

if (!fs.existsSync(bitmapDestinationDir)) {
    console.log(`Creating directory: ${bitmapDestinationDir}`);
    fs.mkdirSync(bitmapDestinationDir);
}

let fileCount = fs.readdirSync(bitmapDestinationDir).length;
const ws = new WebSocket(wsUrl);

ws.onmessage = async (event) => {
    const bitmapName = `${fileCount++}.bmp`;
    console.log(`Received bitmap ${bitmapName}`);

    const bitmap = await event.data.arrayBuffer();
    const fileName = `${bitmapDestinationDir}/${bitmapName}`;

    await fs.promises.writeFile(fileName, Buffer.from(bitmap));
};

ws.onopen = () => {
    console.log('Connected to WebSocket');
};

ws.onclose = () => {
    console.log('Disconnected from WebSocket');
};