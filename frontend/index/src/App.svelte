<script lang="ts">
    import FileViewer from "./FileView.svelte";
    import pageIcon from "./assets/svelte.svg";
    import Editor from "./Editor.svelte";
    import NavBar from "./NavBar.svelte";
    import CurrentFile from "$lib/CurrentFile.svelte";
</script>

<svelte:head>
    <link rel="icon" type="image/svg+xml" href={pageIcon}/>
</svelte:head>

<div id="app">
    <NavBar/>
    <main>
        <aside>
            <CurrentFile/>
            <div class="file-viewer">
                <div style="direction: ltr">
                    <FileViewer tree={{label: '', isDir: true}}/>
                </div>
            </div>
        </aside>
        <section class="editor">
            <Editor/>
        </section>
    </main>
</div>

<style>
    #app {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
    }

    main {
        display: flex;
        flex-grow: 1;
        height: 100%;
    }

    .editor {
        flex: 1;
        overflow-y: auto;
        overflow-x: auto;
    }

    .file-viewer {
        padding: 7px 10px;
        direction: rtl;
        height: 100%;
        overflow-y: auto;
        overflow-x: auto;
    }

    aside {
        width: 300px;
        border-right: 1px solid rgba(204, 204, 204, 0.5);
    }
</style>
