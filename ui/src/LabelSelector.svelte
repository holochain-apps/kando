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
  <div on:click={handleClick(type)} class='wrapper' class:selected={option === type} title="Filter by '{emoji}'">
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
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
  }
  .selected {
    background-color: #eee;
  }
</style>

