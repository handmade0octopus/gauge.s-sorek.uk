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

// If file does not exist, it will be created, otherwise it will be updated
export async function upsertFileOld(filePath: string, newContent: string | File, dataType: string = 'text/plain') {
    const formData = new FormData();

    let content: File | Blob = newContent as File;
    if (typeof newContent === 'string') {
        content = new Blob([newContent], {type: dataType});
    }

    formData.append("data", content, filePath);

    const res = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        body: formData,
    });

    await throwIfNotOk(res);
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

export async function get(path: string): Promise<string> {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'GET',
    });

    if (res.ok) {
        return await res.text();
    }

    await throwIfNotOk(res);
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
