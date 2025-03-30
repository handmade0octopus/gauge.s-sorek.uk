<script lang="ts" context="module">
    import {type Writable, writable} from "svelte/store";

    export enum MenuItemType {
        LabelEditable,
        Button,
        Label,
        Hr,
    }

    export interface MenuItem {
        type: MenuItemType;
        content?: string;
        onClick?: () => void | Promise<void>;
        onNameChange?: (newName: string) => void | Promise<void>;
    }

    // pos is cursor position when right click occur
    let pos = writable({x: 0, y: 0});
    // menu is dimension (height and width) of context menu
    let menu: Writable<any> = writable({h: 0, y: 0});
    // browser/window dimension (height and width)
    let browser: Writable<any> = writable({h: 0, y: 0});
    // showMenu is state of context-menu visibility
    let showMenu = writable(false);

    let menuItems: Writable<MenuItem[]> = writable([]);

    export function showContextMenu(e: MouseEvent, newMenuItems?: MenuItem[]) {
        browser.set({
            w: window.innerWidth,
            h: window.innerHeight
        });
        pos.set({
            x: e.clientX,
            y: e.clientY
        });
        showMenu.set(true);

        if (newMenuItems) {
            menuItems.set(newMenuItems);
        }
    }
</script>

<script lang="ts">
    showMenu.subscribe(() => {
        // If bottom part of context menu will be displayed
        // after right-click, then change the position of the
        // context menu. This position is controlled by `top` and `left`
        // at inline style.
        // Instead of context menu is displayed from top left of cursor position
        // when right-click occur, it will be displayed from bottom left.

        if ($browser.h - $pos.y < $menu.h)
            $pos.y = $pos.y - $menu.h;
        if ($browser.w - $pos.x < $menu.w)
            $pos.x = $pos.x - $menu.w;
    });

    function getContextMenuDimension(node) {
        // This function will get context menu dimension
        // when navigation is shown => showMenu = true
        let height = node.offsetHeight
        let width = node.offsetWidth
        menu.set({
            h: height,
            w: width
        });
    }

    function wrapOnClick(fn: () => void | Promise<void>) {
        return async () => {
            await fn();
            showMenu.set(false);
        };
    }
</script>

{#if $showMenu}
    <nav use:getContextMenuDimension style="z-index: 1000; position: absolute; top:{$pos.y}px; left:{$pos.x}px">
        <div class="navbar" id="navbar">
            <ul>
                {#each $menuItems as item}
                    {#if item.type === MenuItemType.Label}
                        <li>
                            <span>{item.content}</span>
                        </li>
                    {:else if item.type === MenuItemType.LabelEditable}
                        <li>
                            <input type="text" value={item.content} on:input={e => item.onNameChange(e.target.value)}/>
                        </li>
                    {:else if item.type === MenuItemType.Hr}
                        <hr/>
                    {:else if item.type === MenuItemType.Button}
                        <li>
                            <button on:click={wrapOnClick(item.onClick)}>{item.content}</button>
                        </li>
                    {/if}
                {/each}
            </ul>
        </div>
    </nav>
{/if}

<div on:click={() => showMenu.set(false)}>
    <slot/>
</div>

<style lang="less">
  @import "../../src/global";

  .navbar {
    display: flex;
    flex-direction: column;
    width: 180px;
    background-color: @navbar-button-bg-color;
    border: @main-bg-color 1px solid;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    padding: 0;
    z-index: 1000;
  }

  .navbar * {
    color: @navbar-button-text-color;
    font-family: visitor, sans-serif;
  }

  .navbar ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .navbar li {
    display: flex;
    align-items: center;
  }

  .navbar li > * {
    padding: 10px;
  }

  .navbar li:hover:has(button) {
    filter: brightness(1.3);
    background-color: @navbar-button-bg-color;
  }

  .navbar button:hover {
    cursor: pointer;
  }

  .navbar button {
    border: none;
    background-color: transparent;
    cursor: pointer;
    font-size: 16px;
    width: 100%;
    height: 100%;
  }

  .navbar hr {
    margin: 0;
    border: none;
    border-top: @main-bg-color 1px solid;
  }

  .navbar span {
    cursor: default;
    font-size: 16px;
    text-align: center;
    width: 100%;
  }

  .navbar input {
    width: 100%;
    padding: 10px;
    margin: 5px 3px;
    height: 10px;
    border-radius: 5px;
    background-color: @navbar-button-bg-color;
    color: @navbar-button-text-color;
    border: none;
    font-size: 16px;
    text-align: center;
  }

  .navbar input:focus {
    outline: none;
  }

  .navbar li:has(input:focus) {
    filter: brightness(1.3);
    background-color: @navbar-button-bg-color;
  }

  .navbar li:last-child {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  .navbar li:first-child {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
</style>
