<script lang="ts">
    import { getContext } from "svelte";
    import type { KanDoStore } from "./kanDoStore";
    import type { EntryHashB64 } from '@holochain/client';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import { faFileImport, faSquarePlus } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';

    export let wide = false

    let newBoardDialog

    const { getStore } :any = getContext('kdStore');

    const store:KanDoStore = getStore();
    $: boardList = store.boardList.stateStore()
    $: activeHash = store.boardList.activeBoardHash;
    $: state = store.boardList.getReadableBoardState($activeHash);
    $: archivedBoards = $boardList.boards.findIndex((board)=>board.status === "archived") >= 0
    $: activeBoards = $boardList.boards.findIndex((board)=>board.status !== "archived") >= 0

    const selectBoard = (hash: EntryHashB64) => {
        if (!$activeHash && wide) {
            store.setUIprops({showMenu:false})
        }
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
<div class="board-menu"
    class:wide={wide} >
    <input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
    <div style="display:flex;flex-direction: row;">
    <div class="new-board" on:click={()=>newBoardDialog.open()} style="margin-left:10px;font-size:14px" title="New Board">New Board <Fa icon={faSquarePlus} size=2x /></div>
    <div class="nav-button" on:click={()=>{fileinput.click();}}  style="margin-left:10px;font-size:14px" title="Import Board">Import Board <Fa icon={faFileImport} size=2x/></div>
    </div>
    {#if activeBoards}
        <h3>Active Boards</h3>
        <div class="boards-section">
            {#each $boardList.boards as board }
                {#if board.status !== "archived" }
                    <div on:click={()=>selectBoard(board.hash)}
                    class="board" id={board.hash}>{board.name}</div>
                {/if}
            {/each}
        </div>
    {/if}
    {#if archivedBoards}
        <h3>Archived Boards</h3>
        <div class="boards-section">
            {#each $boardList.boards as board }
                {#if board.status === "archived" }
                <div class="board" id={board.hash} on:click={unarchiveBoard(board.hash)}>{board.name}</div>

                {/if}
            {/each}
        </div>
    {/if}

    <NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>

</div>

<style>
  .wide {
    width: 100%;
  }
  .boards-section {
    display: flex;
    flex-wrap: wrap;
  }
  .board-menu {
    height: calc(100vh - 50px);
    overflow: auto;
    background-color: aliceblue;
    min-width: 320px;
    display: flex;
    flex-direction: column;
    background: linear-gradient(94.53deg, #164B9A 12.76%, #5B47D6 99.41%);
    flex: 0 0 auto;
    align-items: flex-start;
    padding: 15px;
  }

.new-board {
    box-sizing: border-box;
    position: absolute;
    width: 290px;
    height: 50px;
    background: #243076;
    border: 1px solid #4A559D;
    border-radius: 5px;
}

  .board {
    width: 290px;
    border-radius: 5px;
    padding: 10px;
    margin: 5px;
    border: 1px solid;
    background-color: antiquewhite;
  }

</style>