<script lang="ts">
    import { Dialog } from 'svelte-materialify';
    import BoardEditor from './BoardEditor.svelte';
    import type { KanDoStore } from './kanDoStore';
    import { getContext } from 'svelte';
  import type { BoardProps, Group, LabelDef } from './board';

    let editLabelDefs = []
    export let active = true
    const { getStore } :any = getContext('tsStore');

    const store:KanDoStore = getStore();

    const addBoard = async (name: string, groups: Group[], labelDefs: LabelDef[], props: BoardProps) => {
        // @ts-ignore
        const board = await store.boardList.makeBoard({name, groups, labelDefs, props, status:""})
        store.boardList.setActiveBoard(board.hashB64())
        active = false
    }

</script>
<Dialog persistent bind:active>
    <BoardEditor title="New Board" handleSave={addBoard} cancelEdit={()=>active=false} labelDefs={editLabelDefs} groups={[]} props={{bgUrl:""}} />
</Dialog>
