<script lang="ts">
    import BoardEditor from './BoardEditor.svelte';
    import type { KanDoStore } from './kanDoStore';
    import { getContext, onMount } from 'svelte';
    import { isEqual } from 'lodash'
    import type { EntryHashB64 } from '@holochain/client';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';
    import type { Board, BoardProps, BoardState, CategoryDef, Group, LabelDef } from './board';

    let boardHash:EntryHashB64|undefined = undefined

    let dialog: SlDialog
    onMount(async () => {

    })

    export const  open = async (hash: EntryHashB64)=> {
        boardHash = hash
        boardEditor.edit(hash)
        dialog.show()
    }

    const { getStore } :any = getContext('kdStore');

    const store:KanDoStore = getStore();

    const updateBoard = async ( name: string, groups: Group[], labelDefs: LabelDef[],  categoryDefs: CategoryDef[], props: BoardProps, showArchived: boolean) => {
        console.log("ARCH", showArchived)
        store.setUIprops({showArchived})

        // ignore board type we don't update that.
        const board: Board | undefined = await store.boardList.getBoard(boardHash)
        if (board) {
        let changes = []
        const state: BoardState = board.state()
        if (state.name != name) {
            store.boardList.requestChanges([
            {
                type: 'set-name',
                hash: board.hashB64(),
                name: name
            }
            ])
            changes.push(
            {
                type: 'set-name',
                name: name
            })
        }
        if (!isEqual(groups, state.groups)) {
            changes.push({type: 'set-groups',
            groups: groups
            })
        }
        if (!isEqual(props, state.props)) {
            changes.push({type: 'set-props',
            props: props
            })
        }
        if (!isEqual(labelDefs, state.labelDefs)) {
            changes.push({type: 'set-label-defs',
            labelDefs: labelDefs
            })
        }
        if (!isEqual(categoryDefs, state.categoryDefs)) {
            changes.push({type: 'set-category-defs',
            categoryDefs: categoryDefs
            })
        }
        if (changes.length > 0) {
            await store.boardList.requestBoardChanges(boardHash, changes)
        }
        }
        close()
    }
    const archiveBoard = () => {
        store.boardList.archiveBoard(boardHash)
        close()
    }
    const close = ()=>{
        dialog.hide()
        boardHash=undefined
    }
    let boardEditor
</script>
<sl-dialog persistent bind:this={dialog} label="Edit Board" 
on:sl-initial-focus={(e)=>{
    boardEditor.initialFocus()
    e.preventDefault()

  }}

on:sl-request-close={(event)=>{
    if (event.detail.source === 'overlay') {
    event.preventDefault();    
}}}>
    <BoardEditor bind:this={boardEditor} handleSave={updateBoard} handleDelete={archiveBoard} cancelEdit={close}/>
</sl-dialog>
