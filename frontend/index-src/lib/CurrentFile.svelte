<script lang="ts">
    import {openedFilePath} from "../store/openedFilePath";
    import {onMount} from "svelte";
    import {currentPath} from "../store/currentPath";

    export let style = "";

    onMount(() => {
        openedFilePath.subscribe((path: string) => {
            currentPath.set(path);
        });
    });
</script>

<div {style}>
    <input type="text" bind:value={$currentPath}>
</div>

<style lang="less">
  @import "../../src/global";

  div {
    width: 150px;
    display: flex;
  }

  input {
    width: 100%;
    padding: 10px;
    margin: 5px 3px;
    height: 10px;
    border-radius: 5px;
    background-color: @navbar-button-bg-color;
    color: @navbar-button-text-color;
    border: none;
    font-size: 16px;
  }

  input:focus {
    outline: none;
  }
</style>