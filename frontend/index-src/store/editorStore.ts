import {writable} from "svelte/store";
import {refreshTreePath} from "./treeStore";
import type {GetFileResponse} from "../lib/api";

export const currentlyEditedFile = writable<string | null>(null);

export const filesBeingEdited: Record<string, GetFileResponse> | null = {};

// delete changes on the files to refresh
refreshTreePath.subscribe(path => {
    if (!path) return;
    for (const filePath in filesBeingEdited) {
        if (filePath.startsWith(path)) {
            delete filesBeingEdited[filePath];
        }
    }
});
