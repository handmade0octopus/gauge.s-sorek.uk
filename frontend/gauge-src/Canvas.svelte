<script lang="ts">
    import svelteHammer, {Hammer} from 'svelte-hammer';
    import {onMount} from "svelte";
    import {WS_URL} from "../index-src/lib/api";

    enum WsGestureRequests {
        Null = 'be0',
        Nudge = 'be1',
        Ok = 'be2',
        Next = 'be3',
        Previous = 'be4',
        Special = 'be5',
        Exit = 'be6',
        Size = 'be7',
    }

    const REFRESH_INTERVAL = 500;
    const bgColor = '#282a36';
    const fgColor = '#f76830';
    const canvasWidth = 128;
    const canvasHeight = 64;

    let lastGesture: WsGestureRequests = WsGestureRequests.Null;
    let isConnected = false;
    let error: string = null;
    let isWsClosed = false;
    let receivedFirstData = false;

    export let canvas: HTMLCanvasElement = null;
    let ctx: CanvasRenderingContext2D;

    onMount(async () => {
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

        const refreshInternal = setInterval(() => {
            console.log('sending: ', lastGesture);
            ws.send(lastGesture);
            lastGesture = WsGestureRequests.Null;
        }, REFRESH_INTERVAL);

        ws.onclose = function () {
            isWsClosed = true;
            error = "WebSocket connection closed, try to refresh the page";
            clearInterval(refreshInternal);
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
    <canvas
            bind:this={canvas}
            use:svelteHammer.swipe={{ direction: Hammer.DIRECTION_ALL }}
            on:swipeleft={() => lastGesture = WsGestureRequests.Previous}
            on:swiperight={() => lastGesture = WsGestureRequests.Next}
            on:swipeup={() => lastGesture = WsGestureRequests.Ok}
            on:swipedown={() => lastGesture = WsGestureRequests.Exit}
            class="canvas"
            width={canvasWidth}
            height={canvasHeight}
    />
{/if}

<style>
    @media (max-width: 800px) {
        .canvas {
            width: 100% !important;
        }
    }

    .canvas {
        width: 40%;

        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
    }
</style>
