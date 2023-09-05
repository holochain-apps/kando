<script lang="ts">
  import EmojiIcon from './icons/EmojiIcon.svelte'
  import { getContext } from "svelte";
  import type { KanDoStore } from "./kanDoStore";

  export let setOption
  export let option

  const handleClick = o => () => {
    if (o === option) {
      setOption(null)
    } else {
      setOption(o)
    }
  }
  const { getStore } :any = getContext("kdStore");
  let kdStore: KanDoStore = getStore();

  $: activeHash = kdStore.boardList.activeBoardHash;
  $: state = kdStore.boardList.getReadableBoardState($activeHash);

</script>

<div class='options'>
  {#each $state.labelDefs as {type, toolTip, emoji}}
  <div on:click={handleClick(type)} class='wrapper board-button' class:selected={option === type} title="Filter by '{emoji}'">
    <EmojiIcon emoji="{emoji}" on:click={handleClick(type)}/>
  </div>
  {/each}
</div>


<style>
  .options {
    display: flex;
  }
  .wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
  }
  .board-button {
    margin-left: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(35, 32, 74, 0.1);
    box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
    border-radius: 5px;
    transition: all .25s ease;
  }
  .selected {
    background-color: rgba(32, 32, 137, 1.0);
  }
</style>

