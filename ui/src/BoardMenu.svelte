<script lang="ts">
    import { Menu, List, ListItem } from 'svelte-materialify';
    import { getContext } from "svelte";
    import type { KanDoStore } from "./kanDoStore";
    import type { EntryHashB64 } from '@holochain/client';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import { faArchive, faChevronDown, faFileImport, faSearch, faSquarePlus } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import '@shoelace-style/shoelace/dist/components/icon/icon.js';
    import '@shoelace-style/shoelace/dist/components/menu/menu.js';
    import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
    import '@shoelace-style/shoelace/dist/components/menu-label/menu-label.js';
    import type { v1 as uuidv1 } from "uuid";
    import type { BoardRecord } from './boardList';

  
    let newBoardDialog

    const { getStore } :any = getContext('kdStore');

    const store:KanDoStore = getStore();
    $: boardList = store.boardList.stateStore()
    $: activeHash = store.boardList.activeBoardHash;
    $: state = store.boardList.getReadableBoardState($activeHash);
    $: archivedBoards = $boardList.boards.findIndex((board)=>board.status === "archived") >= 0
    $: activeBoards = $boardList.boards.findIndex((board)=>board.status !== "archived") >= 0

    const selectBoard = (hash: EntryHashB64) => {
        store.boardList.setActiveBoard(hash)
    }

    let fileinput;
	const onFileSelected = (e)=>{
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.addEventListener("load", async () => {
            const b = JSON.parse(reader.result as string)
            const board = await store.boardList.makeBoard(b)
            selectBoard(board.hashB64())
        }, false);
        reader.readAsText(file);
    };
    const unarchiveBoard = (hash: EntryHashB64) => () => {
        store.boardList.unarchiveBoard(hash)
    }

</script>

<div class="board-menu">
<input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
<div class="nav-button" on:click={()=>newBoardDialog.open()} style="margin-left:10px" title="New Board"><Fa icon={faSquarePlus} size=2x /></div>
<div class="nav-button" on:click={()=>{fileinput.click();}} title="Import Board"><Fa icon={faFileImport} size=2x/></div>
{#if activeBoards}
<sl-select
    placeholder="Select Board"
    on:sl-change={(e)=>{selectBoard(e.target.value)}}
>
    {#each $boardList.boards as board }
        {#if board.status !== "archived" }
            <sl-option value={board.hash}>{board.name}</sl-option>
        {/if}
    {/each}
</sl-select>
{/if}
{#if archivedBoards}
<Menu>
    <div slot="activator">
        <sl-button style="margin-left:10px" title="Archived Boards">
            <Fa icon={faArchive}></Fa>
            <Fa icon={faChevronDown}></Fa>
        </sl-button>
    </div>
    <List>
        {#each $boardList.boards as board }
            {#if board.status === "archived" }
                <ListItem dense={true} on:click={unarchiveBoard(board.hash)}>{board.name}</ListItem>
            {/if}
        {/each}
    </List>
</Menu>
{/if}

<NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>

</div>
<style>
  .board-menu {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
</style>