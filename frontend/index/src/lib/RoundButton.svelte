<script lang="ts">
    import {createEventDispatcher} from "svelte";

    export let showSpinner = false;

    const dispatch = createEventDispatcher();

    function handleClick(event: Event) {
        dispatch('click', event);
    }
</script>

{#if showSpinner}
    <p>Loading...</p>
{:else}
    <button on:click={handleClick}>
        <slot/>
    </button>
{/if}

<style>
    button {
        background-color: #E45826;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        margin: 5px;
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
