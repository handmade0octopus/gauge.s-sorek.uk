export const API_URL = '/api';

// If file does not exist, it will be created, otherwise it will be updated
export async function upsertFile(filePath: string, newContent: string | File, dataType: string = 'text/plain') {
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
    await get('/restartToWifi');
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
    let resText = await res.text().catch(() => {}); // ignore errors

    if (!res.ok) {
        throw new Error(`ERROR[${res.status}]: ${res.statusText} \n ${resText}`);
    }
}
