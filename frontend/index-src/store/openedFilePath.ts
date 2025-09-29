import {writable} from "svelte/store";

export const openedFilePath = writable<string>('/');