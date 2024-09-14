<script lang="ts">
import {currentPath} from "../store/currentPath";
</script>

<div>
    <input type="text" bind:value={$currentPath}>
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