<script lang="ts">
  import { type AsyncReadable } from "@holochain-open-dev/stores";
  import { EntryRecord } from "@holochain-open-dev/utils";
  import { type Commit } from "@holochain-syn/core";
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import Avatar from "./Avatar.svelte";
  import { stateFromCommit } from "@holochain-syn/core";
  import {
    decodeHashFromBase64,
  } from "@holochain/client";
  import { _getCard, type BoardState } from "./board";
  import { exportBoard } from "./export";
  import SvgIcon from "./SvgIcon.svelte";
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  const dispatch = createEventDispatcher()

  const { getStore }: any = getContext("store");
  let store: KanDoStore = getStore();

  export let commit: AsyncReadable<EntryRecord<Commit>>;
  $: commitEntry = commit;
  export let showCommit = false;

  const getState = (entry: EntryRecord<Commit>): BoardState => {
    const state = stateFromCommit(entry.entry) as BoardState
    return state
  }
</script>

{#if $commitEntry.status == "pending"}
  ...
{:else if $commitEntry.status == "error"}
  err:{$commitEntry.error}
{:else if $commitEntry.status == "complete"}
  {@const entry = $commitEntry.value}
  <div
    class="commit"
    on:click={() => dispatch("toggle-commit")}
  >
    
    <Avatar size={20} agentPubKey={entry.action.author} />
    {store.timeAgo.format(new Date(entry.action.timestamp))}
    {#if showCommit}
      {@const state = getState(entry)}

    <sl-button size="small" title="Export"
    on:click={(e) => {
      e.stopPropagation()
      exportBoard(state);
    }}
    ><SvgIcon
                  icon="faFileExport"
                  style="background: transparent; opacity: .5; position: relative; top: -2px;"
                  size="14px"
                />
    </sl-button>
      <div>
        Steward: <Avatar
          size={20}
          agentPubKey={decodeHashFromBase64(state.steward)}
        />
      </div>
      <div class="columns">
        {#each state.groups as group}
          {@const grouping = state.grouping[group.id]}
          <div class="column">
            <div class="column-title">
              {#if group.id == "_"}
                Archive
              {:else}
                {group.name}
              {/if}
            </div>
            {#if grouping}
              {#each grouping as cardId}
                {@const [card, idx] = _getCard(state, cardId)}
                <div class="card-item" title={`${card.props.title}:${card.props.description}`}>
                  {card.props.title.length>10 ? `${card.props.title.slice(0,10)}...` : card.props.title}
                  {#if card.props.description}...{/if}
                </div>
              {/each}
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .columns {
    display: flex;
    flex-direction: row;
    margin-top: 4px;
  }
  .column {
    padding: 0px 5px;
    margin-right: 4px;
    border-radius: 2px;
    font-size: 80%;
    max-width: 80px;
    background-color: lightgray;

  }
  .column-title {
    font-weight: bold;
  }
  .card-item {
    border-radius: 2px;
    margin-bottom: 2px;
    background-color: white;
  }
  .commit {
    cursor: pointer;
    padding: 4px;
    margin: 4px;
    border-radius: 5px;
    background-color: lightblue;
  }
</style>
