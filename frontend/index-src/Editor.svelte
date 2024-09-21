<script lang="ts">
    import CodeMirror from "svelte-codemirror-editor";
    import * as api from "./lib/api";
    import {basicSetup} from 'codemirror';
    import {dracula} from '@ddietr/codemirror-themes/dracula.js';
    import {jsonc, jsoncLanguage} from "@shopify/lang-jsonc";
    import {autocompletion, CompletionContext} from "@codemirror/autocomplete";
    import {EditorState} from '@codemirror/state'
    import {LanguageSupport} from "@codemirror/language";
    import {currentPath} from "./store/currentPath";
    import {refreshTreePath} from "./store/treeStore";
    import {currentlyEditedFile, filesBeingEdited} from "./store/editorStore";

    let isLoading = false;
    let error = null;

    $: {
        $refreshTreePath;
        error = null; // reset error
        const isNotFetched = !filesBeingEdited[$currentPath] && filesBeingEdited[$currentPath] !== "";
        if (isNotFetched && $currentPath !== '/' && $currentPath) {
            isLoading = true;

            api.get($currentPath).then(data => {
                filesBeingEdited[$currentPath] = data;
                currentlyEditedFile.set($currentPath);
            }).catch(err => {
                error = err;
            }).finally(() => isLoading = false);
        }
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
        //linter(
        autocompletion({override: [jsonCompletion]}),
        EditorState.tabSize.of(2),
    ];
</script>

{#if isLoading}
    <p>Loading...</p>
{:else if error}
    <p>Select file</p>
    <p>{error.message}</p>
{:else if filesBeingEdited[$currentPath] === null}
    <p>Select file</p>
{:else}
    <CodeMirror
            {extensions}
            bind:value={filesBeingEdited[$currentPath]}
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