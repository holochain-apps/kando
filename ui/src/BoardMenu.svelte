<script lang="ts">
    import { getContext } from "svelte";
    import { USING_FEEDBACK, type KanDoStore } from "./stores/kando";
    import { KanDoCloneManagerStore } from "./stores/cloneManager";
    import { type EntryHash } from '@holochain/client';
    import GroupParticipants from './GroupParticipants.svelte';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import SvgIcon from "./SvgIcon.svelte";
    import AboutDialog from "./AboutDialog.svelte";
    import SettingsDialog from "./SettingsDialog.svelte";
    import KDLogoIcon from "./icons/KDLogoIcon.svelte";
    import BoardMenuItem from "./BoardMenuItem.svelte";
    import { BoardType } from "./boardList";
    import { isWeaveContext } from "@theweave/api";
    import { UngroupedName } from "./board";
    import CloneManagerDialog from "./CloneManagerDialog.svelte";
    import CloneManagerShareDialog from "./CloneManagerShareDialog.svelte";
    export let wide = false

    let newBoardDialog

    const { getStore } :any = getContext('store');
    const { getStore: getCloneManagerStore } :any = getContext("cloneManagerStore");

    const store:KanDoStore = getStore();
    let cloneManagerStore: KanDoCloneManagerStore = getCloneManagerStore();
    let weaveGroupName: string
    let aboutDialog
    let settingsDialog
    let cloneManagerDialog
    let cloneManagerShareDialog

    $: activeBoards = store.boardList.activeBoardHashes
    $: archivedBoards = store.boardList.archivedBoardHashes
    $: activeCellInfoNormalized = cloneManagerStore.activeCellInfoNormalized;

    $: uiProps = store.uiProps

    const bgUrl = "none"

    const closeActiveCard = ()=> {
        store.boardList.setActiveCard(undefined)
    }

    const selectBoard = async (hash: EntryHash) => {
        store.setUIprops({showMenu:false})
        store.setActiveBoard(hash)
        closeActiveCard()
    }

    const unarchiveBoard = async (hash: EntryHash) => {
        store.boardList.unarchiveBoard(hash)
        selectBoard(hash)
    }

    const loadWeaveGroupName = async () => {
        if(!store.weaveClient) return;
        
        //@ts-ignore  this should only be called in applet-view so there will always be an appletHash
        const appletInfo = await store.weaveClient.appletInfo(store.weaveClient.renderInfo.appletHash);
        const groupProfile = await store.weaveClient.groupProfile(appletInfo.groupsHashes[0]);
        weaveGroupName = groupProfile.name;
    };

    loadWeaveGroupName();
</script>

<div class="board-menu"
    class:wide={wide} >

    {#if !isWeaveContext() && !USING_FEEDBACK}
        <GroupParticipants/>
    {/if}
        <h3 class="type-header">Boards</h3>
        <div class="boards-section">
            <div class="new-board" on:click={()=>newBoardDialog.open()} title="New Board"><SvgIcon color="white" size=25px icon=faSquarePlus style="margin-left: 15px;"/><span>New Board</span></div>
            {#if $activeBoards.status == "complete" && $activeBoards.value.length > 0}
                {#each $activeBoards.value as hash}
                    <div
                        on:click={()=>selectBoard(hash)}
                        class="board" >
                        <BoardMenuItem boardType={BoardType.active} boardHash={hash}></BoardMenuItem>
                        <div class="board-bg" style="background-image: url({bgUrl});"></div>
                    </div>
                {/each}
            {/if}
        </div>
    <!-- {#if $uiProps.recent.length > 0 || activeBoards}
        <h3 class="type-header">Active Boards</h3>
        <div class="boards-section">
            {#if $uiProps.recent.length > 0}
                {#each $uiProps.recent as boardHash }
                    <div class="board"
                        on:click={()=>{
                            selectBoard(decodeHashFromBase64(boardHash))
                        }}>
                            <BoardMenuItem boardType={BoardType.active} boardHash={hash}></BoardMenuItem>
                            <div class="board-bg" style="background-image: url({bgUrl});"></div>
                    </div>
                {/each}
            {/if}
            {#if activeBoards}
                {#each $boardList.boards as board }
                    {#if board.status !== "archived" && !$uiProps.recent.includes(board.hash)}
                        <div
                            on:click={()=>selectBoard(board.hash)}
                            class="board" id={board.hash}>
                            <BoardMenuItem boardType={BoardType.active} boardHash={hash}></BoardMenuItem>
                            <div class="board-bg" style="background-image: url({bgUrl});"></div>
                        </div>
                    {/if}
                {/each}
            {/if}
        </div>
    {/if} -->
    <div style="display:flex; align-items:center;margin-top:20px;">
        <h3 class="type-header">{UngroupedName} Boards</h3>
        <sl-checkbox
            style="margin-left:10px;color:#ccc"
            checked={$uiProps.showArchivedBoards}
            on:sl-input={(e)=>store.setUIprops({showArchivedBoards:e.target.checked})}
            >
            Show
        </sl-checkbox>
    </div>
    {#if $uiProps.showArchivedBoards}
        {#if $archivedBoards.status == "complete"}
            {#if $archivedBoards.value.length > 0}
                <div class="boards-section">
                    {#each $archivedBoards.value as hash}
                        <div
                            on:click={()=>unarchiveBoard(hash)}
                            class="board" >
                            <BoardMenuItem boardType={BoardType.archived} boardHash={hash}></BoardMenuItem>
                            <div class="board-bg" style="background-image: url({bgUrl});"></div>
                        </div>
                    {/each}
                </div>
            {:else}
                <p style="color:#ccc;margin-left:40px;">(no archived boards)</p>
            {/if}
        {/if}
    {/if}

    <NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>
    <div class="footer" 
        class:slideOut={$uiProps.showMenu == false}>   
        <div class="logo" title="About KanDo!"
            on:click={()=>{
                if (USING_FEEDBACK) {
                    store.setUIprops({showFeedback:!$uiProps.showFeedback})}
                }}
        >
            <KDLogoIcon />
        </div>
        <div>
            {#if isWeaveContext()}
                <div on:click={()=>cloneManagerShareDialog.open()} style="background-color:  #164B9A; padding: 3px 5px; border-radius: 10px;">
                    <div style="display: flex; justify-content: flex-start; align-items: center">
                        <div style="margin-right: 10px; font-weight: bold; color: #fff">{weaveGroupName}</div>
                        <SvgIcon icon="faShare" size="20px" color="#fff"/>
                    </div>
                </div>
            {:else}
                <div on:click={()=>cloneManagerDialog.open()} style="background-color:  #164B9A; padding: 3px 5px; border-radius: 10px;">
                    <div style="display: flex; justify-content: flex-start; align-items: center">
                        <div style="margin-right: 10px; font-weight: bold; color: #fff">{$activeCellInfoNormalized.displayName}</div>
                        <SvgIcon icon="network" size="20px" color="#fff"/>
                    </div>
                </div>
            {/if}
            <div on:click={()=>settingsDialog.open()} style="margin-left:10px;"><SvgIcon icon=faCog size="20px" color="#fff"/></div>
            {#if USING_FEEDBACK}
                <sl-button style="margin-left:10px" size="small" pill on:click={()=>store.setUIprops({showFeedback:!$uiProps.showFeedback})}>My Feedback Items</sl-button>
            {/if}
            <div style="margin-left:10px;" on:click={()=>aboutDialog.open()}><SvgIcon icon=info color="#fff"></SvgIcon></div>
        </div>
    </div>
</div>

<AboutDialog bind:this={aboutDialog} />
<SettingsDialog bind:this={settingsDialog} />
{#if isWeaveContext()}
    <CloneManagerShareDialog bind:this={cloneManagerShareDialog} cell={$activeCellInfoNormalized} name={weaveGroupName}/>
{:else}
    <CloneManagerDialog bind:this={cloneManagerDialog} />
{/if}

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
        overflow-y: auto;
        overflow-x: hidden;
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
        padding-bottom: 50px;
    }

    .wide.board-menu {
        width: 100vw;
        height: calc(100vh - 50px);
    }


    .board-menu::-webkit-scrollbar {
        width: 10px;
        background-color: transparent;
    }

    .board-menu::-webkit-scrollbar-thumb {
        height: 5px;
        border-radius: 0;
        background: rgba(20,60,119,.9);
        opacity: 1;
    }

    .wide {
        width: 100vw;
        max-width: 100vw;
    }

    .type-header {
        font-size: 16px;
        font-weight: normal;
        color: #ccc;
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
        background: rgba(24, 55, 122, 1.0);
        border: 1px solid #4A559D;
        color: #fff;
        display: flex;
        align-items: center;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
        transition: all .25s ease;
        top: 3px;
        padding: 15px 0;
        box-shadow: 0px 4px 8px rgba(35, 32, 74, 0);
    }

    .new-board:hover {
        cursor: pointer;
        padding: 15px 5px;
        width: 300px;
        border: 1px solid #252d5d;
        background: rgb(10, 25, 57);
        margin: 0 -5px 0 -5px;
        box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.8);
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
        transition: all .25s ease;
        border: 1px solid;
        background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgb(200 221 237) 100%);
        position: relative;
        display: block;
        box-shadow: 0px 4px 8px rgba(35, 32, 74, 0.8);
    }

    .board:hover {
        cursor: pointer;
        z-index: 100;
        padding: 15px;
        width: 300px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 100%);
        margin: 0 -10px 0 -5px;
        box-shadow: 0px 4px 14px rgba(35, 32, 74, 0.8);
        z-index: 100;
    }

    .wide .board:hover {
        margin: 0 0 0 0;
    }

    .footer {
        position: fixed;
        padding: 10px;
        border-radius: 0;
        bottom: 0px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 330px;
        left: 0;
        background-color: rgba(23, 55, 123, .9);
        animation-duration: .3s;
        animation-name: slideIn;
        animation-iteration-count: 1;
        animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1.1);
        z-index: 1000;
        --margin-end-position: 0px;
        --margin-start-position: -330px;
        margin-left: 0;
    }

    .footer.slideOut {
      animation-duration: .3s;
      animation-name: slideIn;
      --margin-end-position: -330px;
      animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1.1);
      --margin-start-position: 0px;
      margin-left: -330px;
    }

    @keyframes slideIn {
        from {
            margin-left: var(--margin-start-position);
            backdrop-filter: blur(10px);
        }

        to {
            margin-left: var(--margin-end-position);
            backdrop-filter: blur(0px);
        }
    }
    
    .wide .footer {
        width: 100%;
        bottom: 0;
    }

    .footer div {
        display: inline-block;
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