<script lang="ts">
    import * as api from './lib/api';
    import NavButton from "./lib/NavButton.svelte";
    import {refreshTreePath} from "./store/refreshTreeStore";
    import {currentPath} from "./store/currentPath";
    import {currentlyEditedFile, filesBeingEdited} from "./store/editorStore";
    import {setPage} from "../src/Router.svelte";
    import CurrentFile from "./lib/CurrentFile.svelte";

    function wrapErrHandler<T>(fn: (...args: any) => Promise<T>): (...args: any) => Promise<T> {
        return (...args) => fn(...args).catch(err => {
            console.error(err);
            alert(err.message);
            throw err;
        });
    }

    let fileInput: HTMLInputElement;

    const loadingButtons = {
        "LOAD_FILE": false,
        "UPLOAD": false,
        "MKDIR": false,
        "MKFILE": false,
        "SAVE": false,
        "RESTART": false,
        "RESTART_TO_WIFI": false,
    };

    function refresh(path: string) {
        refreshTreePath.set(path || '/');
        refreshTreePath.set(null); // it allows us later to refresh the same path
    }

    async function createPath() {
        await wrapErrHandler(api.createPath)($currentPath);

        const partToCutIdx = $currentPath.replace(/\/$/, '').lastIndexOf('/');
        const dirToRefresh = $currentPath.slice(0, partToCutIdx);

        refresh(dirToRefresh);
    }

    function loadFile() {
        fileInput.click();
    }

    function upload() {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const content = reader.result as string;
            let path = $currentPath + '/' + file.name;
            path = path.replaceAll('//', '/');

            loadingButtons.UPLOAD = true;
            await wrapErrHandler(api.upsertFile)(path, content);
            loadingButtons.UPLOAD = false;
            refresh($currentPath);
        };

        reader.readAsText(file);
    }

    async function mkdir() {
        loadingButtons.MKDIR = true;
        await createPath();
        loadingButtons.MKDIR = false;
    }

    async function mkfile() {
        loadingButtons.MKFILE = true;
        await createPath();
        loadingButtons.MKFILE = false;
    }

    async function save() {
        const path = $currentlyEditedFile;
        const content = filesBeingEdited[$currentlyEditedFile];
        if (!path || !content || content === '/') return;

        loadingButtons.SAVE = true;
        await wrapErrHandler(api.upsertFile)(path, content);
        loadingButtons.SAVE = false;
    }

    async function restart() {
        loadingButtons.RESTART = true;
        await wrapErrHandler(api.restart)();
        loadingButtons.RESTART = false;
    }

    async function restartToWifi() {
        loadingButtons.RESTART_TO_WIFI = true;
        await wrapErrHandler(api.restartToWifi)();
        loadingButtons.RESTART_TO_WIFI = false;
    }
</script>

{"" /* It is for uploading files */ + ""}
<input bind:this={fileInput} type="file" id="fileInput" style="display: none;"/>
<nav>
    <NavButton on:click={loadFile}>LOAD FILE</NavButton>
    <CurrentFile/>
    <NavButton showSpinner={loadingButtons.UPLOAD} on:click={upload}>UPLOAD</NavButton>
    <NavButton showSpinner={loadingButtons.MKDIR} on:click={mkdir}>MKDIR</NavButton>
    <NavButton showSpinner={loadingButtons.MKFILE} on:click={mkfile}>MKFILE</NavButton>
    <NavButton showSpinner={loadingButtons.SAVE} on:click={save}>SAVE</NavButton>
    <NavButton showSpinner={loadingButtons.RESTART} on:click={restart}>RESTART</NavButton>
    <NavButton showSpinner={loadingButtons.RESTART_TO_WIFI} on:click={restartToWifi}>TO WIFI</NavButton>
    <NavButton on:click={() => setPage('gauge')}>GAUGE</NavButton>
</nav>

<style lang="less">
  @import "../src/global";

  nav {
    display: flex;
    background-color: @navbar-bg-color;
    box-shadow: 0 2px 4px rgba(35, 35, 35, 0.5);
    z-index: 1;
  }
</style>