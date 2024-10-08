import {type Writable, writable} from 'svelte/store';

export const refreshTreePath: Writable<string | null> = writable(null);
export const treeViewerExpanded: Writable<boolean> = writable(false);
