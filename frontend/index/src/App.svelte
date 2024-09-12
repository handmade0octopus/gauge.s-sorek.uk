<script lang="ts">
    import FileViewer from "./FileView.svelte";
    import pageIcon from "./assets/svelte.svg";
    import Editor from "./Editor.svelte";
    import NavBar from "./NavBar.svelte";
    import FileSearch from "$lib/FileSearch.svelte";

    let openedFile: string = null;
</script>

<svelte:head>
    <link rel="icon" type="image/svg+xml" href={pageIcon}/>
</svelte:head>

<NavBar/>
<main>
    <aside>
        <FileSearch/>
        <FileViewer bind:openedFile expand marginLeft={false} tree={{label: '', isDir: true}}/>
    </aside>
    <section>
        <Editor/>
    </section>
</main>

<style>
    main {
        display: flex;
    }

    section {
        flex: 1;
        overflow-y: auto;
        overflow-x: auto;
    }

    aside {
        width: 300px;
        overflow-y: auto;
        overflow-x: auto;
        border-right: 1px solid rgba(204, 204, 204, 0.5);
    }
</style>
