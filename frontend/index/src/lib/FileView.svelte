<script context="module" lang="ts">
    export interface TreeNode {
        label: string;
        isDir: boolean;
        children?: Promise<TreeNode[]>;
        clicked?: boolean;
    }
</script>
<script lang="ts">
    import * as api from '$lib/api';
    import {onMount} from "svelte";

    export let openedFile: string = null;
    export let expand = false;
    export let dirPath = "/";
    export let marginLeft = true;
    export let tree: TreeNode = null;

    $: children = tree?.clicked ? (tree?.children || []) : [];

    onMount(() => {
        if (expand) toggleExpand(tree);
    });

    function toggleExpand(child: TreeNode) {
        if (!child.isDir) {
            const filePath = dirPath + child.label;

            if (openedFile === filePath) {
                openedFile = null;
            } else {
                openedFile = filePath;
            }
            return;
        }

        child.clicked = !child.clicked;

        // if initially it was true, then we don't need to fetch children
        if (!child.clicked) {
            tree = {...tree};
            return;
        }

        console.log('child: ', child);
        const entries = api.listDir(dirPath + child.label);

        child.children = entries.then(dir => dir.map(e => ({
            label: e.name,
            isDir: e.type === "dir",
            clicked: false,
        })));
        tree = {...tree};
    }
</script>

<main>
    {#await children}
        <p>Loading...</p>
    {:then children}
        {#each children as child}
            {@const childPath = `${dirPath}${child.label}`}
            <div class:marginLeft>
            <span on:click={() => toggleExpand(child)} class:clicked={child.clicked || openedFile === childPath}
                  class="label"
                  class:directory={child.isDir}>{child.label}</span>
                <svelte:self bind:openedFile dirPath={childPath + '/'} bind:tree={child}/>
            </div>
        {/each}
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
    }

    .directory::before {
        content: "📁";
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