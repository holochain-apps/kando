<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./kanDoStore";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import Participants from "./Participants.svelte";
  import { BoardType } from "./boardList";

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("kdStore");
  let store: KanDoStore = getStore();

  export let boardHash: EntryHash
  export let boardType: BoardType

  let width = 10

  $: boardData = store.boardList.boardData2.get(boardHash)

</script>
<div class="wrapper" on:click={()=>{dispatch("select")}} >
    {#if $boardData.status == "complete"}
      <div class="board-name">{$boardData.value.latestState.name}</div>
      {#if boardType == BoardType.active}
      <div style="width:100%; display:flex; justify-content:flex-end" bind:clientWidth={width}>
        <Participants board={$boardData.value.board} max={Math.floor(width/30)}></Participants>
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
        font-size: 16px;
        font-weight: bold;
        margin-right: 10px;
    }
</style>