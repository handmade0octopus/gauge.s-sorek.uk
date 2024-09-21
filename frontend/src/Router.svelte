<script context="module" lang="ts">
    import {writable} from "svelte/store";

    export type PageParam = "" | "gauge";

    export let page = writable<PageParam>("");

    export function setPage(newPage?: PageParam) {
        newPage = newPage || "";
        const url = new URL(window.location.href);

        url.searchParams.set('page', newPage);
        window.history.pushState({}, '', url.toString());
        page.set(newPage);
    }
</script>
<script lang="ts">
    import favIcon from "./assets/favicon.png";
    import {onMount} from "svelte";

    import IndexApp from "../index-src/App.svelte";
    import GaugeApp from "../gauge-src/App.svelte";

    function updatePage() {
        const newPage = new URLSearchParams(window.location.search)
            .get('page')
            .toLowerCase() as PageParam;
        page.set(newPage);
    }


        updatePage();
        window.addEventListener('popstate', updatePage);

</script>
<svelte:head>
    <link rel="icon" type="image/svg+xml" href={favIcon}/>
</svelte:head>

{#if $page === "gauge"}
    <GaugeApp/>
{:else}
    <IndexApp/>
{/if}