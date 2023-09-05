<script lang="ts">
    import { getContext } from "svelte";
    import type { KanDoStore } from "./kanDoStore";
    import type { EntryHashB64 } from '@holochain/client';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import { faSquarePlus } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import AboutDialog from "./AboutDialog.svelte";
    import KDLogoIcon from "./icons/KDLogoIcon.svelte";
    import { faCog } from "@fortawesome/free-solid-svg-icons";
    export let wide = false

    let newBoardDialog

    const { getStore } :any = getContext('kdStore');

    const store:KanDoStore = getStore();



    $: uiProps = store.uiProps
    $: boardList = store.boardList.stateStore()
    $: activeHash = store.boardList.activeBoardHash;
    $: state = store.boardList.getReadableBoardState($activeHash);
    $: archivedBoards = $boardList.boards.findIndex((board)=>board.status === "archived") >= 0
    $: activeBoards = $boardList.boards.findIndex((board)=>board.status !== "archived") >= 0

    // const DEFAULT_KD_BG_IMG = "none"
    // const NO_BOARD_IMG = "none"
    // $: boardState = store ? store.boardList.getReadableBoardState($activeHash) :  undefined
    // $: bgUrl = boardState ?  ($boardState.props && $boardState.props.bgUrl) ? $boardState.props.bgUrl : DEFAULT_KD_BG_IMG : NO_BOARD_IMG
    const bgUrl = "none"


    const closeActiveCard = ()=> {
        store.boardList.setActiveCard(undefined)
    }

    const selectBoard = (hash: EntryHashB64) => {
        store.setUIprops({showMenu:false})
        store.setActiveBoard(hash)
        closeActiveCard()
    }

    const unarchiveBoard = (hash: EntryHashB64) => () => {
        store.boardList.unarchiveBoard(hash)
        store.setUIprops({showMenu:false})
    }

    let aboutDialog

</script>

<AboutDialog bind:this={aboutDialog} />
<div class="board-menu"
    class:wide={wide} >
    <div style="display:flex;flex-direction: row;">
    <div class="new-board" on:click={()=>newBoardDialog.open()} style="margin-left:10px;font-size:14px" title="New Board"><Fa icon={faSquarePlus} size=2x style="margin-left: 15px;"/><span>New Board</span></div>
    </div>
    {#if $uiProps.recent.length > 0}
        <h3 class="type-header">Recent Boards</h3>
        <div class="boards-section">
            {#each $uiProps.recent as boardHash }
                <div class="board"
                    on:click={()=>{
                        selectBoard(boardHash)
                    }}>
                    <div class="board-name">{$boardList.boards.find(b=>b.hash==boardHash).name}</div>
                    <div class="board-bg" style="background-image: url({bgUrl});"></div>
                </div>
            {/each}
        </div>
    {/if}
    {#if activeBoards}
        <h3 class="type-header">Active Boards</h3>
        <div class="boards-section">
            {#each $boardList.boards as board }
                {#if board.status !== "archived" }
                    <div
                        on:click={()=>selectBoard(board.hash)}
                        class="board" id={board.hash}>
                        <div class="board-name">{board.name}</div>
                        <div class="board-bg" style="background-image: url({bgUrl});"></div>
                    </div>
                {/if}
            {/each}
        </div>
    {/if}
    {#if archivedBoards}
        <h3 class="type-header">Archived Boards</h3>
        <div class="boards-section">
            {#each $boardList.boards as board }
                {#if board.status === "archived" }
                <div class="board" id={board.hash} on:click={unarchiveBoard(board.hash)}>
                    <div class="board-name">{board.name}</div>
                    <div class="board-bg" style="background-image: url({bgUrl});"></div>
                </div>
                {/if}
            {/each}
        </div>
    {/if}

    <NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>
    <div class="footer" on:click={()=>aboutDialog.open()}>   
        <div class="logo" title="About KanDo!"><KDLogoIcon /></div>
        <Fa icon={faCog} class="cog" size="1.5x" color="#fff"/>
    </div>
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
        min-width: 330px;
        width: 330px;
        max-width: 0;
        display: flex;
        flex-direction: column;
        background: linear-gradient(94.53deg, #164B9A 12.76%, #5B47D6 99.41%);
        flex: 0 0 auto;
        align-items: flex-start;
        position: relative;
        padding: 15px;
        transition: all .25s ease;
    }

    .wide {
        width: 100vw;
        max-width: 100vw;
    }

    .type-header {
        font-size: 12px;
        font-weight: normal;
        color: #fff;
        opacity: .6;
        margin-top: 20px;
        margin-bottom: 10px;
        margin-left: 5px;
    }

    .board-name {
        font-size: 16px;
        font-weight: bold;
    }

    .new-board {
        box-sizing: border-box;
        position: relative;
        width: 290px;
        height: 50px;
        background: #243076;
        border: 1px solid #4A559D;
        color: #fff;
        display: flex;
        align-items: center;
        border-radius: 5px;
    }

    .new-board span {
        color: #fff;
        display: block;
        padding: 0 15px;
    }

    .board {
        width: 290px;
        border-radius: 5px;
        padding: 10px;
        margin: 5px;
        border: 1px solid;
        background-color: #fff;
        position: relative;
    }

    .board:hover {
        cursor: pointer;
    }

    .footer {
        position: absolute;
        bottom: 0;
        height: 40px;
        display: flex;
        align-items: center;
    }

    .footer:hover {
        cursor: pointer;
    }

    .logo {
        height: 16px;
        margin-right: 5px;
    }

    .board-bg {
        position: absolute;
        z-index: 0;
        height: 100%;
        width: 100%;
        background-size: cover;
    }

</style>