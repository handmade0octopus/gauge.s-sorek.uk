<script context="module" lang="ts">
    export type ButtonSize = 'small' | 'medium' | 'large';
</script>

<script lang="ts">
    import {createEventDispatcher} from "svelte";

    export let showSpinner = false;
    export let disabled = false;
    export let size: ButtonSize = 'small';
    export let style: string = "";

    const dispatch = createEventDispatcher();

    function handleClick(event: Event) {
        dispatch('click', event);
    }
</script>

<button {style} class={size} on:click={handleClick} {disabled}>
    {#if showSpinner}
        Loading...
    {:else}
        <slot/>
    {/if}
</button>

<style lang="less">
  @import "../../src/global";

  button {
    border: none;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(35, 35, 35, 0.5);
    margin: 5px 3px;
    min-width: 50px;
    height: 30px;
    padding: 5px 10px;
    color: @navbar-button-text-color;
    background-color: @navbar-button-bg-color;
    font-family: 'visitor', sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button:hover {
    background-color: #72769a;
    transition: 0.4s;
  }

  button:disabled {
    background-color: #72769a;
    color: #b3b3b3;
  }

  button:active {
    background-color: #9d9fac;
    color: #b3b3b3;
  }

  .large {
    font-size: 30px;
    height: 40px;
    padding: 20px 20px;
  }
</style>
