<script lang="ts">
    import CodeMirror from "svelte-codemirror-editor";
    import {vscodeDark} from '@uiw/codemirror-theme-vscode';
    import {json} from "@codemirror/lang-json";

    let value = "{}";

    const extensions = [vscodeDark];
</script>

<CodeMirror
        {extensions}
        bind:value
        lang={json()}
        styles={{
                ':has(&), &': {
                    height: '100%',
                }
            }}
/>
