<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import type { BoardState } from "./board";
  import SvgIcon from "./SvgIcon.svelte";

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();

  export let boardHash: EntryHash


  $: boardData = store.boardList.boardData2.get(boardHash)
  $: uiProps = store.uiProps
  const myCards = (state: BoardState) => {
    return state.cards.filter(
      (card) => card.creator === store.myAgentPubKeyB64
    );
  };
  const getColumn = (state: BoardState, cardId: string) => {
    if (state) {
        for (let [groupId, itemIds] of Object.entries(state.grouping)){
            //@ts-ignore
            const index = itemIds.findIndex((id) => id === cardId)
            if (index >= 0) {
              const gIndex = state.groups.findIndex((g) => g.id === groupId)
              if (gIndex>=0){
                  return state.groups[gIndex].name
              }
            }
        }
    }
    return "unknown"
  }

</script>
<div class="wrapper"  >
    {#if $boardData.status == "complete"}
      {@const board = $boardData.value.latestState}
       {@const cards = myCards(board)}
       {#if cards.length > 0}
      <div style="display:flex;flex-direction:column;">
        <div class="board-name">Feedback for {board.name}</div>
        <div class="cards">
          {#each myCards(board) as card}
            <div class="card"
            on:click={()=>{
              store.boardList.setActiveBoard(boardHash)
              store.boardList.setActiveCard(card.id)
              }}
            >
              <span>Title: {card.props.title}</span>
              <span>Status: {getColumn(board, card.id)}</span>
              {#if Object.keys(card.comments).length>0}
              <span><SvgIcon icon=faComments />: {Object.keys(card.comments).length}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
        {/if}
    {:else if $boardData.status == "pending"}
      <sl-skeleton
        effect="pulse"
        style="height: 10px; width: 100%"
        ></sl-skeleton>
    {:else if $boardData.status == "error"}
      {$boardData.error}
    {/if}
</div>
<style>

  .wrapper {
    width: 100%;
    border-radius: 50%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .board-name {
    font-size: 14;
    margin-top: 20px;
    margin-bottom: 10px;
    color: white;
    }
  .cards {
    display: flex;
    flex-wrap: wrap;
  }
  .card {
    padding: 5px;
    margin: 10px;
    display: flex;
    flex-direction: column;
    color: black;
    cursor: pointer;
  }

</style>