<script lang="ts">
    import {onMount} from "svelte";
    import {WS_URL} from "../index-src/lib/api";

    const bgColor = '#282a36';
    const fgColor = '#f76830';
    const canvasWidth = 128;
    const canvasHeight = 64;

    let isConnected = false;
    let error: string = null;
    let isWsClosed = false;
    let receivedFirstData = false;

    export let canvas: HTMLCanvasElement = null;
    let ctx: CanvasRenderingContext2D;

    onMount(() => {
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const ws = new WebSocket(WS_URL);

        ws.onopen = function () {
            isConnected = true;
        };

        ws.onerror = function (event) {
            error = event.toString();
        };

        ws.onmessage = async function (event) {
            try {
                receivedFirstData = true;
                const data = await event.data.arrayBuffer();
                drawBitmap(new Uint8Array(data));
            } catch (e) {
                error = e.toString();
            }
        };

        ws.onclose = function () {
            isWsClosed = true;
            error = "WebSocket connection closed, try to refresh the page";
        };
    });


    function drawBitmap(data: Uint8Array) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = fgColor;
        for (let y = 0; y < canvasHeight; ++y) {
            for (let x = 0; x < canvasWidth; ++x) {
                const rX = canvasWidth - 1 - x;
                const rY = canvasHeight - 1 - y;
                const index = (rX + Math.floor(rY / 8) * canvasWidth);

                const bit = (data[index] & (0x01 << (rY & 7)));
                if (bit) {
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
</script>

{#if error}
    <p>{error}</p>
{:else if !isConnected}
    <p>Connecting...</p>
{:else if !receivedFirstData}
    <p>Waiting for data...</p>
{/if}

{#if !isWsClosed}
    <canvas class="canvas" width={canvasWidth} height={canvasHeight} bind:this={canvas}></canvas>
{/if}

<style>
    .canvas {
        width: 40%;

        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
    }
</style>
