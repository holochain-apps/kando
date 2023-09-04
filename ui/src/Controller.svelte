<script lang="ts">
    import Toolbar from './Toolbar.svelte'
    import KanDoPane from './KanDoPane.svelte'
    import { KanDoStore } from './kanDoStore'
    import { setContext } from 'svelte';
    import type { AppAgentClient } from '@holochain/client';
    import type { SynStore } from '@holochain-syn/store';
    import type { ProfilesStore } from "@holochain-open-dev/profiles";
    import Fa from 'svelte-fa';
    import { faCog, faFileImport, faSquarePlus } from '@fortawesome/free-solid-svg-icons';
    import KDLogoIcon from "./icons/KDLogoIcon.svelte";
    import BoardMenu from "./BoardMenu.svelte";
    import { slide } from 'svelte/transition';

    export let roleName = ""
  
    let synStore: SynStore;
    let kdStore: KanDoStore;
    
    export let client : AppAgentClient
    export let profilesStore : ProfilesStore|undefined = undefined

    $: activeBoardHash = kdStore && kdStore.boardList ? kdStore.boardList.activeBoardHash : undefined

    initialize()

    setContext('synStore', {
      getStore: () => synStore,
    });
  
    setContext('kdStore', {
      getStore: () => kdStore,
    });
    const DEFAULT_KD_BG_IMG = "none"
    //const DEFAULT_KD_BG_IMG = "https://img.freepik.com/free-photo/studio-background-concept-abstract-empty-light-gradient-purple-studio-room-background-product-plain-studio-background_1258-54461.jpg"
    const NO_BOARD_IMG = "none"
    $: boardList = kdStore? kdStore.boardList.stateStore() : undefined
    $: archivedBoards = boardList ? $boardList.boards.filter((board)=>board.status === "archived") : []
    $: activeBoards = boardList ? $boardList.boards.filter((board)=>board.status !== "archived") : []
    $: boardState = kdStore ? kdStore.boardList.getReadableBoardState($activeBoardHash) :  undefined
    $: bgUrl = boardState ?  ($boardState.props && $boardState.props.bgUrl) ? $boardState.props.bgUrl : DEFAULT_KD_BG_IMG : NO_BOARD_IMG
    $: bgImage = `background-image: url("`+ bgUrl+`");`
    $: myAgentPubKey = kdStore ? kdStore.myAgentPubKey() : undefined
    $: uiProps = kdStore ? kdStore.uiProps : undefined

    async function initialize() : Promise<void> {
      const store = createStore()
      synStore = store.synStore;
      try {
        await store.loadBoards()
        kdStore = store
      } catch (e) {
        console.log("Error loading boards:", e)
      }
    }
    function createStore() : KanDoStore {
      const store = new KanDoStore(
        client,
        roleName
      );
      return store
    }
    let menuVisible = false
  </script>
  
  <svelte:head>
    <script src='https://kit.fontawesome.com/80d72fa568.js' crossorigin='anonymous'></script>
  </svelte:head>
  <div class="flex-scrollable-parent">
    <div class="flex-scrollable-container">
      <div class='app'>

      {#if kdStore}
      <div class="wrapper">

      <div class="header">
        <Toolbar 
          profilesStore={profilesStore}/>
      </div>

      <div class="workspace" style="display:flex">

      {#if $uiProps.showMenu}
        {#if boardList && $boardList.boards.length > 0 && $activeBoardHash === undefined}
          <div class="board-menu" >
            <BoardMenu wide={true}></BoardMenu>
          </div>
        {:else}
          <div class="board-menu" transition:slide={{ axis: 'x', duration: 400 }} >
            <BoardMenu wide={false}></BoardMenu>
          </div>
        {/if}
      {/if}
        
        {#if $activeBoardHash !== undefined}
          <KanDoPane on:requestChange={(event) => {kdStore.boardList.requestBoardChanges($activeBoardHash,event.detail)}}/>
        {/if}
        </div>
        </div>
      {:else}
        <div class="loading"><div class="loader"></div></div>
      {/if}
      <div class="background">
        <div class="background-overlay"></div>
        <div class="background-image"
              style={`background-image: url(${bgUrl}`}></div>
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
  .background {
    position: absolute;
    z-index: 0;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .background-overlay {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.87) 0%, rgba(148, 179, 205, 0.78) 100%);
    position: absolute;
    z-index: 2;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
  }

  .background-image {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 1;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-size: cover;
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
    0% { -webkit-transform: rotate(0deg); }
    100% { -webkit-transform: rotate(360deg); }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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
  .flex-scrollable-x {
    max-width: 100%;
    overflow-x: auto;
  }
  .flex-scrollable-y {
    max-height: 100%;
    overflow-y: auto;
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
