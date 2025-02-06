<script lang="ts">
    export let src: string;
    export let onClick: () => any;
    export let alt = "";
    export let size = 24;
</script>

<button style="--icon-size: {size}px" class="icon-button" on:click={onClick}>
    <img {src} {alt}/>
</button>

<style lang="less">
    .icon-button {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0;
        margin: 0;
        width: var(--icon-size);
        height: var(--icon-size);
    }

    img {
        width: 100%;
        height: 100%;
    }
</style>
