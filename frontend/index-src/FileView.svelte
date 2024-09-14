<script context="module" lang="ts">
    export interface TreeNode {
        label: string;
        isDir: boolean;
        children?: Promise<TreeNode[]>;
        clicked?: boolean;
    }
</script>
<script lang="ts">
    import * as api from './lib/api';
    import {onMount} from "svelte";
    import folderIcon from './assets/folder.svg';
    import {refreshTreePath} from "./store/refreshTreeStore";
    import {currentPath} from "./store/currentPath";

    export let isRoot = true;
    export let dirPath = "/";
    export let marginLeft = false;
    export let tree: TreeNode = null;

    // if clicked then children, else empty array
    $: children = tree?.clicked ? (tree?.children || []) : [];

    refreshTreePath.subscribe(path => {
        if (path === dirPath + tree.label) {
            tree.children = fetchChildren();
            tree = {...tree};
        }
    });

    onMount(() => {
        if (isRoot) toggleExpand();
    });

    $: {
        // if someone click to the current file, then we need highlight it
        if ($currentPath === (dirPath + tree.label) && !tree.clicked && !isRoot) {
            tree.clicked = true;
            tree = {...tree};
        }

        // if someone click to another file, then we need to remove highlight from current file
        if ($currentPath !== (dirPath + tree.label) && tree.clicked && !isRoot && !tree.isDir) {
            tree.clicked = false;
            tree = {...tree};
        }
    }

    function toggleExpand() {
        if (!tree.isDir) {
            let filePath = dirPath + tree.label;

            if ($currentPath === filePath) {
                console.log('cooo kurwa??', $currentPath, filePath);
                currentPath.set('/');
            } else {
                currentPath.set(filePath);
            }
            return;
        }

        tree.clicked = !tree.clicked;

        // if initially it was true, then we don't need to fetch children
        if (!tree.clicked) {
            tree = {...tree};
            return;
        }

        tree.children = fetchChildren()
        tree = {...tree};
    }

    async function fetchChildren(): Promise<TreeNode[]> {
        const entries = api.listDir(dirPath + tree.label);
        let dir = await entries;
        return dir.map(e => ({
            label: e.name,
            isDir: e.type === "dir",
            clicked: false,
        }));
    }

    $: {
        console.log($currentPath, dirPath + tree.label, $currentPath === (dirPath + tree.label));
    }
</script>

<main style="--folder-icon: url({folderIcon})">
    {#if !isRoot}
        <a
                on:click={toggleExpand}
                class:clicked={tree.clicked || $currentPath === (dirPath + tree.label)}
                class="label"
                class:directory={tree.isDir}
        >{tree.label}</a>
    {/if}
    {#await children}
        <p>Loading...</p>
    {:then children}
        <div class:marginLeft>
            {#each children as child}
                {@const childDirPath = `${dirPath}${tree.label}/`.replaceAll('//', '/')}

                <svelte:self
                        marginLeft={true}
                        isRoot={false}
                        dirPath={childDirPath}
                        bind:tree={child}
                />
            {/each}
        </div>
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}
</main>

<style>
    .clicked {
        font-weight: bold;
    }

    .label {
        cursor: pointer;
    }

    .directory {
        display: inline-flex;
        align-items: center;
        vertical-align: center;
    }

    .directory::before {
        content: '';
        background-image: var(--folder-icon);
        background-size: 1em 1em;
        display: inline-block;
        width: 1em;
        height: 1em;
        margin-right: 4px;
    }

    main {
        display: flex;
        flex-direction: column;
        font-family: sans-serif;
    }

    .marginLeft {
        margin-left: 20px;
    }
</style>