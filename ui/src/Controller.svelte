<script lang="ts">
    import Toolbar from './Toolbar.svelte'
    import KanDoPane from './KanDoPane.svelte'
    import { KanDoStore } from './stores/kando'
    import { setContext } from 'svelte';
    import type { SynStore } from '@holochain-syn/store';
    import BoardMenu from "./BoardMenu.svelte";
    import FeedbackPane from "./FeedbackPane.svelte";

    export let store: KanDoStore;
    let synStore: SynStore = store.synStore


  $: activeBoardHash = store.boardList.activeBoardHash;
  $: activeBoard = store.boardList.activeBoard;

  setContext("synStore", {
    getStore: () => synStore,
  });

  setContext("store", {
    getStore: () => store,
  });
  const DEFAULT_KD_BG_IMG = "none";
  //const DEFAULT_KD_BG_IMG = "https://img.freepik.com/free-photo/studio-background-concept-abstract-empty-light-gradient-purple-studio-room-background-product-plain-studio-background_1258-54461.jpg"
  const NO_BOARD_IMG = "none";
  $: uiProps = store.uiProps;
  $: boardCount = store.boardList.boardCount;

  $: bgUrl = DEFAULT_KD_BG_IMG; // FIXME$activeBoard ?   ($activeBoard.state.props && $boardState.props.bgUrl) ? $boardState.props.bgUrl : DEFAULT_KD_BG_IMG
  $: bgImage = `background-image: url("` + bgUrl + `");`;
  let menuVisible = false;
</script>

<div class="flex-scrollable-parent">
  <div class="flex-scrollable-container">
    <div class="app">
      <div class="wrapper">
        <div class="header">
          <Toolbar />
        </div>
        <div class="workspace" style="display:flex">
          {#if $uiProps.showFeedback}
            <FeedbackPane></FeedbackPane>
          {:else if $uiProps.showMenu && $boardCount.status == "complete"}
            {#if $activeBoardHash === undefined}
              <div class="board-menu">
                <BoardMenu wide={true}></BoardMenu>
              </div>
            {:else}
              <div class="board-menu">
                <BoardMenu wide={false}></BoardMenu>
              </div>
            {/if}
          {:else}
            <div class="board-menu slideOut">
              <BoardMenu wide={false}></BoardMenu>
            </div>
          {/if}

          {#if $activeBoardHash !== undefined}
            <KanDoPane activeBoard={$activeBoard} />
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

  .board-menu {
    animation-duration: 0.3s;
    animation-name: slideIn;
    animation-iteration-count: 1;
    animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1.1);
    z-index: 199;
    --margin-end-position: 0px;
    --margin-start-position: -330px;
    margin-left: 0;
  }

  .board-menu.slideOut {
    animation-duration: 0.3s;
    animation-name: slideIn;
    --margin-end-position: -330px;
    animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1.1);
    --margin-start-position: 0px;
    margin-left: -330px;
  }

  @keyframes slideIn {
    from {
      margin-left: var(--margin-start-position);
      backdrop-filter: blur(10px);
    }

    to {
      margin-left: var(--margin-end-position);
      backdrop-filter: blur(0px);
    }
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

  .loading {
    text-align: center;
    padding-top: 100px;
  }
  .loader {
    border: 8px solid #f3f3f3;
    border-radius: 50%;
    border-top: 8px solid #3498db;
    width: 50px;
    height: 50px;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
    display: inline-block;
  }
  @-webkit-keyframes spin {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
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

  /* .my-boards {
    display: flex;
  }
  .my-board {
    border-radius: 5px;
    border: 1px solid #222;
    background-color: lightcyan;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px;
    width: 100px;
    margin: 5px;
  } */
</style>
