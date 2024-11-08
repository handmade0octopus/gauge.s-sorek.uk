<script lang="ts">
    import CodeMirror from "svelte-codemirror-editor";
    import * as api from "./lib/api";
    import {basicSetup} from 'codemirror';
    import {dracula} from '@ddietr/codemirror-themes/dracula.js';
    import {jsonc, jsoncLanguage} from "@shopify/lang-jsonc";
    import {autocompletion, CompletionContext} from "@codemirror/autocomplete";
    import {EditorState} from '@codemirror/state'
    import {LanguageSupport} from "@codemirror/language";
    import {openedFilePath} from "./store/openedFilePath";
    import {refreshTreePath} from "./store/treeStore";
    import {currentlyEditedFile, filesBeingEdited} from "./store/editorStore";
    import type {GetFileResponse} from "./lib/api";

    let isLoading = false;
    let error = null;

    $: {
        $refreshTreePath;
        error = null; // reset error
        const isNotFetched = !filesBeingEdited[$openedFilePath];
        if (isNotFetched && $openedFilePath !== '/' && $openedFilePath) {
            isLoading = true;

            api.get($openedFilePath).then(data => {
                filesBeingEdited[$openedFilePath] = data;
                if(data.isBinary) {
                    downloadFile(data);
                    return;
                }
                currentlyEditedFile.set($openedFilePath);
            }).catch(err => {
                error = err;
            }).finally(() => isLoading = false);
        } else {
            if(filesBeingEdited[$openedFilePath]?.isBinary) {
                downloadFile(filesBeingEdited[$openedFilePath]);
                openedFilePath.set(null);
            }
        }
    }

    function downloadFile(data: GetFileResponse) {
        const url = window.URL.createObjectURL(new Blob([data.buffer]));
        const link = document.createElement('a');

        link.href = url;
        link.setAttribute('download', data.name);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }


    function jsonCompletion(context: CompletionContext) {
        let word = context.matchBefore(/\w*/);
        if (word && word.from === word.to && !context.explicit) return null;

        return {
            from: word ? word.from : context.pos,
            options: [
                {label: "true", type: "keyword"},
            ]
        };
    }

    const extensions = [
        basicSetup,
        dracula,
        new LanguageSupport(jsoncLanguage),
        autocompletion({override: [jsonCompletion]}),
        EditorState.tabSize.of(2),
    ];
</script>

{#if isLoading}
    <p>Loading...</p>
{:else if error}
    <p>Select file</p>
    <p>{error.message}</p>
{:else if !filesBeingEdited[$openedFilePath]}
    <p>Select file</p>
{:else}
    <CodeMirror
            {extensions}
            bind:value={filesBeingEdited[$openedFilePath].content}
            lang={jsonc()}
            styles={{
                '&': {
                    height: '100%',
                }
            }}
    />
{/if}

<style>
    :global(.codemirror-wrapper) {
        height: 100%;
    }
</style>