<script lang="ts">
    import Canvas from "./Canvas.svelte";
    import NavButton from "../index-src/lib/NavButton.svelte";
    import * as api from "../index-src/lib/api";
    import {setPage} from "../src/Router.svelte";

    let canvas: HTMLCanvasElement;

    async function fullScreen() {
        await canvas.requestFullscreen();
    }

    const buttonStyle = `
        min-width: 250px;
        height: 70px;
    `;
</script>

<main>
    <Canvas bind:canvas/>
    <aside>
        <NavButton on:click={fullScreen} style={buttonStyle} size="large">Full screen</NavButton>
        <NavButton on:click={() => setPage()} style={buttonStyle} size="large">File editor</NavButton>
        <NavButton on:click={api.restart} style={buttonStyle} size="large">Restart</NavButton>
    </aside>
</main>

<style>
    main {
        display: flex;
        flex-grow: 1;
        height: 100%;
        gap: 20px;
        padding: 10px;
    }

    @media (max-width: 800px) {
        main {
            flex-direction: column;
            align-items: center;
        }
    }

    aside {
        width: 250px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
</style>