<script>
    import RoundButton from "$lib/RoundButton.svelte";

    function upload() {
        console.log('upload');
    }
</script>

<nav>
    <RoundButton on:click={upload}>UPLOAD</RoundButton>
    <RoundButton>MKDIR</RoundButton>
    <RoundButton>MKFILE</RoundButton>
    <RoundButton>SAVE</RoundButton>
    <RoundButton>RESTART</RoundButton>
    <RoundButton>RESTART TO WIFI</RoundButton>
    <RoundButton>GAUGE</RoundButton>
</nav>

<style>
    nav {
        display: flex;
        justify-content: center;
        padding: 10px;
        background-color: #505050;
    }
</style>