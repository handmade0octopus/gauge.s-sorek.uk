<script lang="ts">
    import * as api from './lib/api';
    import NavButton from "./lib/NavButton.svelte";
    import {refreshTreePath} from "./store/treeStore";
    import {currentlyEditedFile, filesBeingEdited} from "./store/editorStore";
    import {setPage} from "../src/Router.svelte";
    import CurrentFile from "./lib/CurrentFile.svelte";
    import burgerIconLeft from "./assets/burger-icon-left.svg";
    import burgerIconRight from "./assets/burger-icon-right.svg";
    import IconButton from "./lib/IconButton.svelte";
    import {currentPath} from "./store/currentPath";
    import {getBasePath, Path} from "./lib/utils";

    function wrapErrHandler<T>(fn: (...args: any) => Promise<T>): (...args: any) => Promise<T> {
        return (...args) => fn(...args).catch(err => {
            console.error(err);
            alert(err.message);
            throw err;
        });
    }

    export let sidebarCollapsed: boolean;

    let uploadSpeed: string | null = null;
    let uploadProgress: number | null = null;
    let navbarCollapsed = true;
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

    function onFileInputChange() {
        const file = fileInput.files[0];
        if (!file) return;

        let fileName: string;

        // By default, all files which name ends with .bin are renamed to update.bin
        if (file.name.endsWith('.bin')) {
            fileName = 'update.bin';
        } else {
            fileName = file.name;
        }

        const path = new Path($currentPath);
        path.popIfFile();
        path.append(fileName);

        currentPath.set('/' + path.toString());
    }

    function formatSpeed(bytesPerSec: number): string {
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s'];
        let index = 0;
        let speed = bytesPerSec;

        while (speed >= 1024 && index < units.length - 1) {
            speed /= 1024;
            index++;
        }

        return `${speed.toFixed(2)} ${units[index]}`;
    }

    function onUploadProgress({percent, throughputBps}: { percent: number, throughputBps: number }) {
        uploadProgress = percent;
        uploadSpeed = formatSpeed(throughputBps);
    }

    async function upload() {
        const file = fileInput.files[0];
        if (!file) return;

        loadingButtons.UPLOAD = true;
        await wrapErrHandler(api.upsertFile)($currentPath, file, file.type, onUploadProgress);
        
        loadingButtons.UPLOAD = false;
        refresh(getBasePath($currentPath));
        
        // wait 2 sec before removing the progress bar:
        await new Promise(resolve => setTimeout(resolve, 2000));
        uploadProgress = null;
        uploadSpeed = null;
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
        const content = filesBeingEdited[$currentlyEditedFile].content;
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
<input bind:this={fileInput} on:change={onFileInputChange} type="file" id="fileInput" style="display: none;"/>
<nav class:navbarCollapsed>
    <div class="expansion-menu">
        <IconButton src={burgerIconLeft} onClick={() => sidebarCollapsed = !sidebarCollapsed}/>
        <IconButton src={burgerIconRight} onClick={() => navbarCollapsed = !navbarCollapsed}/>
    </div>
    <NavButton on:click={loadFile}>LOAD FILE</NavButton>
    <CurrentFile/>
    <NavButton showSpinner={loadingButtons.UPLOAD} on:click={upload}>UPLOAD</NavButton>
    <NavButton showSpinner={loadingButtons.MKDIR} on:click={mkdir}>MKDIR</NavButton>
    <NavButton showSpinner={loadingButtons.MKFILE} on:click={mkfile}>MKFILE</NavButton>
    <NavButton showSpinner={loadingButtons.SAVE} on:click={save}>SAVE</NavButton>
    <NavButton showSpinner={loadingButtons.RESTART} on:click={restart}>RESTART</NavButton>
    <NavButton showSpinner={loadingButtons.RESTART_TO_WIFI} on:click={restartToWifi}>TO WIFI</NavButton>
    <NavButton on:click={() => setPage('gauge')}>GAUGE</NavButton>
    {#if (uploadSpeed && (uploadProgress !== null))}
        <div class="progress">
            <progress value={uploadProgress} max="100"/>
            <span>{uploadProgress}%</span>
            <span>{uploadSpeed}</span>
        </div>
    {/if}
</nav>

<style lang="less">
  @import "../src/global";

  @media (max-width: 800px) {
    nav {
      flex-direction: column;
      align-items: center;
    }

    nav > :global(:not(.expansion-menu)) {
      width: 50%;
    }

    .navbarCollapsed > :global(:not(.expansion-menu)) {
      display: none;
    }

    .expansion-menu {
      display: flex !important;
    }
  }
  
  .progress {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-left: 10px;
    font-family: 'visitor', sans-serif;
    font-size: 1.2em;
  }

  .progress > span {
    text-align: center;
    display: inline-flex;
    align-items: center;
  }

  .expansion-menu {
    width: 100%;
    display: none;
    flex-direction: row;
    justify-content: space-between;
  }

  nav {
    flex-wrap: wrap;
    display: flex;
    background-color: @navbar-bg-color;
    box-shadow: 0 2px 4px rgba(35, 35, 35, 0.5);
    z-index: 1;
  }
</style>