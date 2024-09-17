<script lang="ts">
    import {currentPath} from "../store/currentPath";
    import {onMount} from "svelte";

    let value = '/';

    onMount(() => {
        currentPath.subscribe(newValue => {
            value = newValue;
        });
    });
</script>

<div>
    <input type="text" bind:value>
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