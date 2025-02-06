<script context="module" lang="ts">
    import {writable} from "svelte/store";

    export type PageParam = "" | "gauge";

    export let page = writable<PageParam>(null);

    function removeEmptyParams() {
        const url = new URL(window.location.href);
        if (url.searchParams.get('page') === "") {
            url.searchParams.delete('page');
            window.history.pushState({}, '', url.toString());
        }
    }

    export function setPage(newPage?: PageParam) {
        newPage = newPage || "";
        const url = new URL(window.location.href);

        url.searchParams.set('page', newPage);
        window.history.pushState({}, '', url.toString());
        page.set(newPage);
        removeEmptyParams();
    }
</script>
<script lang="ts">
    import favIcon from "./assets/favicon.png";

    import IndexApp from "../index-src/App.svelte";
    import GaugeApp from "../gauge-src/App.svelte";

    function updatePage() {
        const newPage = new URLSearchParams(window.location.search || '?page=')
            .get('page')
            .toLowerCase() as PageParam;
        page.set(newPage);
    }

    updatePage();
    window.addEventListener('popstate', updatePage);
    removeEmptyParams();
</script>
<svelte:head>
    <link rel="icon" type="image/svg+xml" href={favIcon}/>
</svelte:head>

{#if $page === "gauge"}
    <GaugeApp/>
{:else}
    <IndexApp/>
{/if}