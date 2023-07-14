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

    export let roleName = ""
  
    let synStore: SynStore;
    let tsStore: KanDoStore;
    
    export let client : AppAgentClient
    export let profilesStore : ProfilesStore|undefined = undefined

    $: activeBoardHash = tsStore && tsStore.boardList ? tsStore.boardList.activeBoardHash : undefined

    initialize()

    setContext('synStore', {
      getStore: () => synStore,
    });
  
    setContext('tsStore', {
      getStore: () => tsStore,
    });
    const DEFAULT_KD_BG_IMG = "https://images.unsplash.com/photo-1557682250-33bd709cbe85"
    //const DEFAULT_KD_BG_IMG = "https://img.freepik.com/free-photo/studio-background-concept-abstract-empty-light-gradient-purple-studio-room-background-product-plain-studio-background_1258-54461.jpg"
    const NO_BOARD_IMG = "https://holochain.org/img/big_logo.png"
    $: boardList = tsStore? tsStore.boardList.stateStore() : undefined
    $: archivedBoards = boardList ? $boardList.boards.filter((board)=>board.status === "archived") : []
    $: activeBoards = boardList ? $boardList.boards.filter((board)=>board.status !== "archived") : []
    $: boardState = tsStore ? tsStore.boardList.getReadableBoardState($activeBoardHash) :  undefined
    $: bgUrl = boardState ?  ($boardState.props && $boardState.props.bgUrl) ? $boardState.props.bgUrl : DEFAULT_KD_BG_IMG : NO_BOARD_IMG
    $: bgImage = `background-image: url("`+ bgUrl+`");`
    $: myAgentPubKey = tsStore ? tsStore.myAgentPubKey() : undefined

    async function initialize() : Promise<void> {
      const store = createStore()
      synStore = store.synStore;
      try {
        await store.loadBoards()
        tsStore = store
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
  
  </script>
  
  <svelte:head>
    <script src='https://kit.fontawesome.com/80d72fa568.js' crossorigin='anonymous'></script>
  </svelte:head>
  <div class="flex-scrollable-parent">
    <div class="flex-scrollable-container">
    <div class='app' style={bgImage}>

    {#if tsStore}
      <Toolbar profilesStore={profilesStore}/>
      {#if ($boardList.avatars[myAgentPubKey] && $boardList.avatars[myAgentPubKey].name) || profilesStore}
        {#if boardList && $boardList.boards.length == 0}
          <div class="welcome-text">
            <h2>Welcome!</h2>
              <p>KanDo offers real-time collaborative Kanban boards for task and project management. </p>
              <p>
                Click on the <Fa style="width:20px; color:black; " icon={faSquarePlus}></Fa> above to create your first board.
                You can add columns for your board, customize voting categories and settings, and more in the board creation window.
              </p>
            <p>You can always edit these settings with the <Fa style="width:20px; color:black; " icon={faCog}></Fa> button in the upper right when you have a board selected. </p>
          </div>
        {/if}
        {#if boardList && $boardList.boards.length > 0 && $activeBoardHash === undefined}
          <div class="welcome-text">
            <!-- {#if !$boardList.agentBoards[myAgentPubKey]} -->
              <p>Active Boards: {activeBoards.length}, Archived Boards: {archivedBoards.length}</p>
                <p>
                  Select a board from the dropdown above, or add a new one with the  <Fa style="width:20px; color:black; " icon={faSquarePlus}></Fa> button.
                  You can add columns for your board, customize voting categories and settings, and more in the board creation window.
                </p>
              <p>You can always edit these settings with the <Fa style="width:20px; color:black; " icon={faCog}></Fa> button in the upper right when you have a board selected. </p>
              <p>Any boards that you have archived will appear under the <Fa style="width:20px; color:black; " icon={faFileImport}></Fa> button, and you can un-archive them by selecting them from the list.</p>
            <!-- {:else}
              <h4> My Boards</h4>
              <div class="my-boards">
                {#each $boardList.agentBoards[myAgentPubKey] as myBoard}
                  <div class="my-board"
                    on:click={()=>tsStore.boardList.setActiveBoard(myBoard)}
                    >
                    {get(tsStore.boardList.getReadableBoardState(myBoard)).name}
                  </div>
                {/each}
              </div>
            {/if} -->
          </div>
        {/if}
      {/if}
      {#if $activeBoardHash !== undefined}
        <KanDoPane on:requestChange={(event) => {tsStore.boardList.requestBoardChanges($activeBoardHash,event.detail)}}/>
      {/if}
    {:else}
      <div class="loading"><div class="loader"></div></div>
    {/if}
  </div>

</div></div>
<style>
  .app {
    margin: 0;
    padding-bottom: 10px;
    background-image: var(--bg-img, url(""));
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100vh;
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
  .welcome-text {
    border-radius: 5px;
    border: 1px solid #222;
    margin: auto;
    margin-top: 50px;
    max-width: 650px;
    padding: 26px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
    background-color: white;
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
