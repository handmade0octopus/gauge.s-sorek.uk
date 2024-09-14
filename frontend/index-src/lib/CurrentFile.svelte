<script lang="ts">
    import {currentPath} from "../store/currentPath";
    import {onMount} from "svelte";

    const TIME_BETWEEN_REFRESH_MS = 2000;

    let value = '/';
    let lastTimeUpdated = Date.now();

    $: value, updateCurrentPath();

    function updateCurrentPath() {
        lastTimeUpdated = Date.now();
        const lastTime = lastTimeUpdated;
        setTimeout(() => {
            if (lastTime === lastTimeUpdated) {
                currentPath.set(value);
            }
        }, TIME_BETWEEN_REFRESH_MS);
    }

    onMount(() => {
        currentPath.subscribe(newValue => {
            value = newValue;
        });
    });
</script>

<div>
    <input type="text" bind:value>
</div>

<style>
    div {
        width: 100%;
        display: flex;
    }

    input {
        width: 100%;
        padding: 10px;
        background-color: rgba(240, 165, 0, 0.9);
        border: none;
        font-size: 16px;
        font-weight: bold;
        color: #1e1f28;
        box-shadow: 0 0 10px rgba(228, 76, 26, 0.5);
    }

    input:focus {
        outline: none;
    }
</style>