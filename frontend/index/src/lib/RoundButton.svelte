<script lang="ts">
    import {createEventDispatcher} from "svelte";

    export let showSpinner = false;
    export let disabled = false;

    const dispatch = createEventDispatcher();

    function handleClick(event: Event) {
        dispatch('click', event);
    }
</script>

<button on:click={handleClick} {disabled}>
    {#if showSpinner}
        Loading...
    {:else}
        <slot/>
    {/if}
</button>

<style>
    button {
        background-color: #E45826;
        border: none;
        box-shadow: 0 2px 4px rgba(35, 35, 35, 0.5);
        margin: 5px;
        min-width: 100px;
        font-size: 20px;
        border-radius: 50px;
        padding: 5px 10px;
        color: #eee;
        font-weight: bold;
    }

    button:hover {
        background-color: #E44C1A;
    }

    button:active {
        background-color: #ca491f;
        box-shadow: none;
    }
</style>
