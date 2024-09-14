import {type Writable, writable} from 'svelte/store';
import {filesBeingEdited} from "./editorStore";

export const refreshTreePath: Writable<string | null> = writable(null);

// delete changes on the files to refresh
refreshTreePath.subscribe(path => {
    if (!path) return;
    for (const filePath in filesBeingEdited) {
        if (filePath.startsWith(path)) {
            delete filesBeingEdited[filePath];
        }
    }
});
