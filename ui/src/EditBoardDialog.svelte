<script lang="ts">
    import { Dialog } from 'svelte-materialify';
    import { cloneDeep } from "lodash";
    import { type Board, type Group, type LabelDef, type BoardState, UngroupedId, type BoardProps, CategoryDef } from './board';
    import BoardEditor from './BoardEditor.svelte';
    import type { KanDoStore } from './kanDoStore';
    import { getContext, onMount } from 'svelte';
    import { isEqual } from 'lodash'
    import type { EntryHashB64 } from '@holochain/client';

    export let boardHash:EntryHashB64|undefined = undefined
    let editName = ''
    let editGroups: Array<Group> = []
    let editLabelDefs = []
    let editCategoryDefs = []
    let editProps:BoardProps = {bgUrl:"",labels:[]}

    onMount(async () => {

        const board: Board | undefined = await store.boardList.getBoard(boardHash)
        if (board) {
            const state = board.state()
            editName = state.name
            editGroups = cloneDeep(state.groups)
            editLabelDefs = cloneDeep(state.labelDefs)
            editCategoryDefs = cloneDeep(state.categoryDefs)
            editProps = state.props ? cloneDeep(state.props) : {bgUrl:""}
            // remove the ungrouped ID TODO find a better way.
            const index = editGroups.findIndex((g)=>g.id == UngroupedId)
            if (index != -1) {
                editGroups.splice(index,1)
            }
        } else {
            console.log("board not found:", boardHash)
        }
    })

    export let active = true
    const { getStore } :any = getContext('tsStore');

    const store:KanDoStore = getStore();

    const updateBoard = (hash: EntryHashB64) => async ( name: string, groups: Group[], labelDefs: LabelDef[],  categoryDefs: CategoryDef[], props: BoardProps) => {
        // ignore board type we don't update that.
        const board: Board | undefined = await store.boardList.getBoard(hash)
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
            await store.boardList.requestBoardChanges(hash,changes)
        }
        }
        close()
    }
    const archiveBoard = (hash: EntryHashB64) => () => {
        store.boardList.archiveBoard(hash)
        close()
    }
    const close = ()=>{
        active=false
        boardHash=undefined
    }

</script>
<Dialog persistent bind:active>
    <BoardEditor title="Edit Board" handleSave={updateBoard(boardHash)} handleDelete={archiveBoard(boardHash)} cancelEdit={close} text={editName} groups={editGroups} labelDefs={editLabelDefs} categoryDefs={editCategoryDefs} props={editProps}/>
</Dialog>
