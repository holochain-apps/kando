<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import Participants from "./Participants.svelte";
  import { BoardType } from "./boardList";
  import { hashEqual } from "./utils/util";

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();

  export let boardHash: EntryHash
  export let boardType: BoardType

  let width = 10

  $: boardData = store.boardList.boardData2.get(boardHash)
  $: uiProps = store.uiProps

</script>
<div class="wrapper" on:click={()=>{
      dispatch("select")
      }} >
    {#if $boardData.status == "complete"}
      {#if !hashEqual($uiProps.tips.get(boardHash), $boardData.value.tip)}
        <div class="unread"></div>
      {/if}

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
  .unread {
    margin-right: 4px;
    width: 0; 
    height: 0; 
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-left: 10px solid green;
  }

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