<script lang="ts">
    import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import { getContext } from "svelte";
    import type { KanDoStore } from "./kanDoStore";
    import Avatar from './Avatar.svelte';
    import "@holochain-open-dev/stores/dist/debug-store.js"
  
    const { getStore } :any = getContext('kdStore');
    const store:KanDoStore = getStore();
  
    $: agents = store.profilesStore.agentsWithProfile
    $: agentBoards = store.boardList.allAgentBoards
    
    //__debugStore(store.boardList.allAgentBoards)
    //.status=="complete" ? sliceAndJoin( store.boardList.boardParticipants, $agents.value): undefined
  
    export const close=()=>{dialog.hide()}
    export const open=()=>{
      dialog.show()
      }
    let dialog
  
  </script>
  
      <sl-dialog label="Participants" bind:this={dialog}>
          <div class="participants">
              <div class="list">
                  {#if $agents.status == "pending"}
                      <sl-skeleton
                          effect="pulse"
                          style="height: 40px; width: 100%"
                      ></sl-skeleton>
                  {:else}
                  <h4 style="margin-left:50px">Contributed to:</h4>
  
                          {#each $agents.status=="complete" ? Array.from($agents.value) : [] as agentPubKey}
                              <div class="list-item">
                                  <Avatar agentPubKey={agentPubKey} size={40} namePosition="column"/>
                                  <div style="margin-left:10px; font-size:120%">
                                      {#if $agentBoards.status=="complete"}
                                      <div class="boards">
                                          {#each $agentBoards.value.get(agentPubKey) as board}
                                              <div class="board" on:click={()=>{
                                                  store.boardList.setActiveBoard(board.board.hash)
                                                  close()
                                              }}>{board.latestState.name}x</div>
                                          {/each}
                                      </div>
                                      {/if}
                                  </div>
                              </div>
                          {/each}
                      {/if}
              </div>
          </div>
      </sl-dialog>
  
  <style>
      .boards {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
      }
      .board {
          border-radius: 5px;
          border: 2px solid rgb(166 115 55 / 26%);
          font-size: 90%;
          font-weight: bold;
          padding: 2px;
          justify-content: center;
          display: flex;
          cursor: pointer;
          margin-right: 5px;
      }
      .board:hover {
          box-shadow: 0px 10px 35px rgb(130 107 58 / 25%);
          transform: scale(1.1);
      }
      .list {
          display: flex;
          flex-direction: column;
      }
      .list-item {
          display: flex;
          align-items: center;
      }
  
      sl-dialog::part(panel) {
          background: #FFFFFF;
          border: 2px solid rgb(166 115 55 / 26%);
          border-bottom: 2px solid rgb(84 54 19 / 50%);
          border-top: 2px solid rgb(166 115 55 / 5%);
          box-shadow: 0px 15px 40px rgb(130 107 58 / 35%);
          border-radius: 10px;
      }
  </style>
  