<script lang="ts">
    import KanDoPane from './KanDoPane.svelte'
    import type { KanDoStore } from './stores/kando'
    import { setContext } from 'svelte';
    import type { EntryHash } from '@holochain/client';
    import type { SynStore } from '@holochain-syn/store';
    import type { v1 as uuidv1 } from "uuid";

    export let store: KanDoStore;
    export let board : EntryHash
    export let columnId : uuidv1

    let synStore: SynStore = store.synStore
    store.boardList.setActiveBoard(board)
    $: activeBoardHash = store.boardList.activeBoardHash
    $: activeBoard = store.boardList.activeBoard

    setContext('synStore', {
      getStore: () => synStore,
    });

    setContext('store', {
      getStore: () => store,
    });
  </script>
  <div class="flex-scrollable-parent">
    <div class="flex-scrollable-container">
      <div class='app'>

      <div class="wrapper">

      <div class="workspace" style="display:flex">


        {#if $activeBoardHash !== undefined}
          <KanDoPane activeBoard={$activeBoard} standAlone={true} singleColumnId={columnId}/>
        {:else}
          Unable to find board.
        {/if}
        </div>
        </div>
    </div>
  </div>
</div>
<style>
  .app {
    margin: 0;
    padding-bottom: 10px;
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background-color: #fff;
    height: 100vh;
    position: relative;
  }

  :global(:root) {
    --resizeable-height: 200px;
    --tab-width: 60px;
  }

  @media (min-width: 640px) {
    .app {
      max-width: none;
    }
  }
  .flex-scrollable-parent {
    position: relative;
    display: flex;
    flex: 1;
  }
  .flex-scrollable-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .wrapper {
    position: relative;
    z-index: 10;
  }

</style>
