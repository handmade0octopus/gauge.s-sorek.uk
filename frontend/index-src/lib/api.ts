import {Path} from "./utils";

// @ts-ignore
const isDev: boolean = import.meta.env.DEV

const API_POSTFIX = isDev ? '/api' : '';

const API_URL = `http://${window.location.host}${API_POSTFIX}`;
export const WS_URL = `ws://${window.location.host}${API_POSTFIX}/ws`;

export async function upsertFile(
    filePath: string,
    newContent: string | File,
    dataType: string = 'text/plain',
    onProgress?: (progress: {percent: number, throughputBps: number}) => void
) {
    const formData = new FormData();

    let content: File | Blob = newContent as File;
    if (typeof newContent === 'string') {
        content = new Blob([newContent], {type: dataType});
    }

    formData.append("data", content, filePath);

    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', `${API_URL}/edit`, true);

        let startTime: number = Date.now();
        let lastUploadedBytes: number = 0;

        xhr.upload.onprogress = (event) => {
            if (onProgress && event.lengthComputable) {
                const currentTime = Date.now();

                const percent = (event.loaded / event.total) * 100;

                // Calculate throughput (bytes per second)
                const elapsedTime = (currentTime - startTime) / 1000; // convert to seconds
                const bytesUploadedSinceLast = event.loaded - lastUploadedBytes;
                const throughput = bytesUploadedSinceLast / elapsedTime; // bytes per second

                lastUploadedBytes = event.loaded;
                startTime = currentTime; // Reset for next calculation

                onProgress({percent, throughputBps: throughput});
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));

        xhr.send(formData);
    });
}

export async function createPath(filePath: string) {
    const formData = new FormData();
    formData.append("path", filePath);

    const res = await fetch(`${API_URL}/edit`, {
        method: 'PUT',
        body: formData
    });

    await throwIfNotOk(res);
}

export interface DirEntry {
    name: string;
    type: 'file' | 'dir';
}

export async function listDir(dirPath: string): Promise<DirEntry[]> {
    const res = await fetch(`${API_URL}/list?dir=${dirPath}`, {
        method: 'GET',
    });

    if (res.ok) {
        const entries: DirEntry[] = await res.json();

        // dirs first:
        entries.sort((a, b) => a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1);
        return entries;
    }

    await throwIfNotOk(res);
}

export interface GetFileResponse {
    name: string;
    content: string;
    buffer: ArrayBuffer;
    isBinary: boolean;
}

export async function get(path: string): Promise<GetFileResponse> {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'GET',
    });

    if (!res.ok) {
        await throwIfNotOk(res);
        return null as any;
    }

    const alternativeFileName = `unknown${path.replaceAll('/', '_')}.bin`;
    const fileName = new Path(path).popIfFile() || alternativeFileName;

    const buffer = await res.arrayBuffer();
    const text = await new Response(buffer).text();

    return {
        buffer,
        name: fileName,
        content: text,
        isBinary: isBinary(buffer),
    };
}

function isBinary(data: ArrayBuffer): boolean {
    const uint8Array = new Uint8Array(data);

    // Heuristic: Look at the first 100 bytes
    const sampleSize = Math.min(100, uint8Array.length);
    let nonPrintableCount = 0;

    for (let i = 0; i < sampleSize; i++) {
        const byte = uint8Array[i];

        // Check for non-printable ASCII characters (excluding common control characters like newline)
        if (byte < 32 && byte !== 10 && byte !== 13) {
            nonPrintableCount++;
        }
    }

    // If more than 10% of the first 100 bytes are non-printable, treat it as binary
    return nonPrintableCount > sampleSize * 0.1;
}

export async function restart() {
    await get('/restart');
}

export async function restartToWifi() {
    await get('/restart?r=wifi');
}

export async function deleteFile(filePath: string) {
    const formData = new FormData();
    formData.append("path", filePath);

    const res = await fetch(`${API_URL}/edit`, {
        method: 'DELETE',
        body: formData,
    });

    await throwIfNotOk(res);
}

async function throwIfNotOk(res: Response) {
    let resText = await res.text().catch(() => undefined); // ignore errors

    if (!res.ok) {
        throw new Error(`ERROR[${res.status}]: ${res.statusText} \n ${resText}`);
    }
}
