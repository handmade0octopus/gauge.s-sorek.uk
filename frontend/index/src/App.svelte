<script lang="ts">
    import FileViewer from "$lib/FileView.svelte";

    let openedFile: string = null;
</script>

<main>
    <aside>
        <FileViewer bind:openedFile expand marginLeft={false} tree={{label: '', isDir: true}}/>
    </aside>
</main>

<style>
    aside {
        width: 300px;
        height: 100vh;
        overflow-y: auto;
        overflow-x: auto;
        border-right: 1px solid #ccc;
    }
</style>
