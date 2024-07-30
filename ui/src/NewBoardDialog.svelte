<script lang="ts">
    import BoardEditor from './BoardEditor.svelte';
    import type { KanDoStore } from './stores/kando';
    import { getContext } from 'svelte';
    import { newFeedKey, type BoardProps, type BoardState, type CategoryDef, type Group, type LabelDef, type BoardDelta } from './board';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';

    let editLabelDefs = []
    let editCategoryDefs = []
    let dialog: SlDialog
    
    const { getStore } :any = getContext('store');

    const store:KanDoStore = getStore();

    const addBoard = async (name: string, groups: Group[], labelDefs: LabelDef[], categoryDefs: CategoryDef[], props: BoardProps) => {
        const state:Partial<BoardState> = {name, groups, labelDefs, categoryDefs, props, status:""}
        state.feed = {}
        state.feed[newFeedKey(store.myAgentPubKeyB64)] = {delta:{type:"create", name}, context:null}
        const board = await store.boardList.makeBoard(state)
        await board.join()        
        store.setUIprops({showMenu:false})
        dialog.hide()
        await store.boardList.setActiveBoard(board.hash)
    }
    export const open = ()=> {
        boardEditor.reset()
        dialog.show()
    }
    let boardEditor

</script>
<sl-dialog bind:this={dialog} label="New Board"
    on:sl-initial-focus={(e)=>{
        boardEditor.initialFocus()
        e.preventDefault()
    }}
    on:sl-request-close={(event)=>{
        if (event.detail.source === 'overlay') {
        event.preventDefault();    
  }}}>
    <BoardEditor bind:this={boardEditor}  handleSave={addBoard} cancelEdit={()=>dialog.hide()} />
</sl-dialog>
