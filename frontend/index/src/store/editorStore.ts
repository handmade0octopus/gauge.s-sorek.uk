import {writable} from "svelte/store";

export const currentlyEditedFile = writable<string | null>(null);

export const filesBeingEdited: Record<string, string> | null = {};
