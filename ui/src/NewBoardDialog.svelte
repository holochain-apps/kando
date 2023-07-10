<script lang="ts">
    import { Dialog } from 'svelte-materialify';
    import { cloneDeep } from "lodash";
    import { BoardType, DEFAULT_KANBAN_LABEL_DEFS, Group, LabelDef, type BoardProps } from './board';
    import BoardEditor from './BoardEditor.svelte';
    import type { TalkingStickiesStore } from './kandoStore';
    import { getContext } from 'svelte';

    export let boardType
    let editLabelDefs = cloneDeep(DEFAULT_KANBAN_LABEL_DEFS)
    export let active = true
    const { getStore } :any = getContext('tsStore');

    const store:TalkingStickiesStore = getStore();

    const addBoard = async (type: BoardType, name: string, groups: Group[], labelDefs: LabelDef[], props: BoardProps) => {
        // @ts-ignore
        const board = await store.boardList.makeBoard({type, name, groups, labelDefs, props, status:""})
        store.boardList.setActiveBoard(board.hashB64())
        active = false
    }

</script>
<Dialog persistent bind:active>
    <BoardEditor title="New Board" handleSave={addBoard} cancelEdit={()=>active=false} boardType={boardType} labelDefs={editLabelDefs} groups={[]} props={{bgUrl:""}} />
</Dialog>
