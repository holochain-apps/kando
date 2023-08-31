<script lang="ts">
    import { Menu, List, ListItem } from 'svelte-materialify';
    import { getContext } from "svelte";
    import type { KanDoStore } from "./kanDoStore";
    import type { EntryHashB64 } from '@holochain/client';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import { faArchive, faChevronDown, faFileImport, faSquarePlus } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import { slide } from 'svelte/transition';
    import AboutDialog from "./AboutDialog.svelte";
    import KDLogoIcon from "./icons/KDLogoIcon.svelte";

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
    let aboutDialog

</script>
<div class="board-menu" >
    <input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
    <div style="display:flex;flex-direction: row;">
    <div class="nav-button" on:click={()=>newBoardDialog.open()} style="margin-left:10px;font-size:14px" title="New Board">New Board <Fa icon={faSquarePlus} size=2x /></div>
    <div class="nav-button" on:click={()=>{fileinput.click();}}  style="margin-left:10px;font-size:14px" title="Import Board">Import Board <Fa icon={faFileImport} size=2x/></div>
    </div>
    {#if activeBoards}
        <h3>Active Boards</h3>
        {#each $boardList.boards as board }
            {#if board.status !== "archived" }
                <div on:click={()=>selectBoard(board.hash)}
                class="board" id={board.hash}>{board.name}</div>
            {/if}
        {/each}
    {/if}
    {#if archivedBoards}
        <h3>Archived Boards</h3>

        <div>
            <sl-button style="margin-left:10px" title="Archived Boards">
                <Fa icon={faArchive}></Fa>
                <Fa icon={faChevronDown}></Fa>
            </sl-button>
        </div>
            {#each $boardList.boards as board }
                {#if board.status === "archived" }
                <div class="board" id={board.hash} on:click={unarchiveBoard(board.hash)}>{board.name}</div>

                {/if}
            {/each}
    {/if}

    <div class="logo" title="About KanDo!" on:click={()=>aboutDialog.open()}><KDLogoIcon /></div>

    <AboutDialog bind:this={aboutDialog} />

    <NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>

</div>

<style>
  .board-menu {
    height: 100%;
    background-color: aliceblue;
    min-width: 300px;
    display: flex;
    flex-direction: column;

    flex: 0 0 auto;
    align-items: flex-start;
  }
  .board {
    width: 100%;
    margin: 5px;
    border: 1px solid;
    background-color: antiquewhite;
  }
  .logo {
    height: 20px;
    margin-right: 10px;
    display: contents;
    cursor: pointer;
  }
</style>