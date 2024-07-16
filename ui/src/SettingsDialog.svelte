<script lang="ts">
    import { getContext } from "svelte";
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import SvgIcon from "./SvgIcon.svelte";
    import { type KanDoStore, NotificationOptions, NotificationType } from "./store";
    import {asyncDerived, toPromise} from '@holochain-open-dev/stores'
    import { BoardType } from "./boardList";
    import type { Board, BoardEphemeralState, BoardState } from "./board";
    import { deserializeExport, exportBoards } from "./export";
    import { DocumentStore, WorkspaceStore } from "@holochain-syn/core";
    import { encodeHashToBase64 } from "@holochain/client";
    import { isWeContext } from "@lightningrodlabs/we-applet";
    import DisableForOs from "./DisableForOs.svelte";

    const { getStore } :any = getContext('store');

    const store:KanDoStore = getStore();
    $: uiProps = store.uiProps

    let dialog
    export const open = ()=>{dialog.show()}

    let fileinput;
	const onFileSelected = (e)=>{
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.addEventListener("load", async () => {
            const importedBoardStates = deserializeExport(reader.result as string)
            if ( importedBoardStates.length > 0) {
                const boards:Array<Board> = []
                for (const b of importedBoardStates) {
                    console.log("importing", b.name)
                    try {
                        boards.push(await store.boardList.makeBoard(b))
                    } catch(e) {
                        console.log("error importing", b.name, e)
                    }
                }
                if (importedBoardStates.length == 1) {
                    store.setUIprops({showMenu:false})
                    boards[0].join()
                    store.setActiveBoard(boards[0].hash)
                }
            }
            importing = false
        }, false);
        importing = true
        reader.readAsText(file);
    };
    const createBoardFrom = async (oldBoard: BoardState) => {
        const board = await store.boardList.cloneBoard(oldBoard, undefined)
        store.setUIprops({showMenu:false})
        store.setActiveBoard(board.hash)
    }
    const exportAllBoards = async () => {
        const boardStates = []
        exporting = true

        const hashes = await toPromise(asyncDerived(store.synStore.documentsByTag.get(BoardType.active),x=>Array.from(x.keys())))
        const docs = hashes.map(hash=>new DocumentStore<BoardState, BoardEphemeralState>(store.synStore, hash))
        for (const docStore of docs) {
            try {
                const workspaces = await toPromise(docStore.allWorkspaces)
                const workspaceStore = new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
                boardStates.push(await toPromise(workspaceStore.latestSnapshot))
            } catch(e) {
                console.log("Error getting snapshot for ", encodeHashToBase64(docStore.documentHash), e)
            }
        }
        exportBoards(boardStates)
        exporting = false
    }
    let importing = false
    let exporting = false

    $: allBoards = store.boardList.allBoards
</script>

<sl-dialog label="Extras" bind:this={dialog} width={1000} >
    <div style="display:flex;flex-direction:column">
        {#if isWeContext()}
            <div class="notifications">
                <h3>Notification Settings</h3>
                <div class="options">
                    {#each NotificationOptions as option}
                        <div class="option">
                            <div style="margin-right:10px;">{option.name}:</div> 
                            <sl-select size="small" style="width:100px" id={option.id} 
                                on:sl-change={(e)=>{{store.setNotifications(e.target.id, e.target.value)}}}
                                value={$uiProps.notifications[option.id]}
                                >
                                <sl-option value={NotificationType.None} >None</sl-option>
                                <sl-option value={NotificationType.Low}>Low</sl-option>
                                <sl-option value={NotificationType.Medium}>Medium</sl-option>
                                <sl-option value={NotificationType.High}>High</sl-option>
                            </sl-select>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <DisableForOs os={["android", "ios"]}>
            <div class="import-export">
                <h3>Import/Export</h3>
                {#if importing}
                    <div class="export-import" title="Import Boards">
                        <div class="spinning" style="margin:auto"><SvgIcon icon=faSpinner color="#fff"></SvgIcon></div>
                    </div>
                {:else}
                    <div class="export-import" on:click={()=>{fileinput.click();}} title="Import Boards">
                        <SvgIcon color="#fff" icon=faFileImport size=20px style="margin-left: 15px;"/><span>Import Boards </span>
                    </div>
                {/if}
                {#if exporting}
                    <div class="export-import" title="Import Boards">
                        <div class="spinning" style="margin:auto"><SvgIcon icon=faSpinner  color="#fff"></SvgIcon></div>
                    </div>
                {:else}
                    <div class="export-import" on:click={()=>{exportAllBoards()}} title="Export All Boards"><SvgIcon color="#fff" icon=faFileExport size=20px style="margin-left: 15px;"/><span>Export All Boards</span></div>
                {/if}
            </div>
            <input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
        </DisableForOs>

        {#if $allBoards.status == "pending"}
            <div class="spinning" style="display:inline-block"> <SvgIcon icon=faSpinner  color="black"></SvgIcon></div>
        {:else if $allBoards.status == "complete"}
            <sl-dropdown skidding=15>
                <sl-button slot="trigger" caret><SvgIcon icon=faClone size=20px style="margin-right: 10px"/><span>New Board From </span></sl-button>
                <sl-menu>
                    {#each Array.from($allBoards.value.entries()) as [key,board]}
                        <sl-menu-item on:click={()=>{
                            createBoardFrom(board.latestState)
                        }} >
                            {board.latestState.name}
                        </sl-menu-item>
                    {/each}
                </sl-menu>
            </sl-dropdown>
        {:else if $allBoards.status == "error"}
            Error: {$allBoards.error}
        {/if}
    </div>

</sl-dialog>

<style>
    .import-export {
        display:flex;
        flex-direction: column;
    }
    
     .notifications {
        border-bottom: solid 1px lightgray;
        margin-bottom:20px;
     }
     .options {
        display:flex;
        flex-direction: column;
     }
     .option {
        margin-left:10px;
        margin-bottom: 5px;
        display:flex;
        flex-direction: row;
        align-items: center;
     }
     .export-import {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        height: 50px;
        background: #243076;
        border: 1px solid #4A559D;
        margin-top: 5px;
        color: #fff;
        display: flex;
        align-items: center;
        border-radius: 5px;
        cursor: pointer;
    }

    .export-import span {
        color: #fff;
        display: block;
        padding: 0 15px;
    }
</style>
  