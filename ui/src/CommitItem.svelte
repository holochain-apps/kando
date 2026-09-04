<script lang="ts">
  import type { AsyncReadable } from "@holochain-open-dev/stores";
  import type { EntryRecord } from "@holochain-open-dev/utils";
  import type { Commit, DocumentStore } from "@holochain-syn/core";
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import Avatar from "./Avatar.svelte";
  import {
    decodeHashFromBase64,
  } from "@holochain/client";
  import { _getCard, type BoardState, type BoardEphemeralState } from "./board";
  import { exportBoard } from "./export";
  import SvgIcon from "./SvgIcon.svelte";
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  const dispatch = createEventDispatcher()

  const { getStore }: any = getContext("store");
  let store: KanDoStore = getStore();

  export let commit: AsyncReadable<EntryRecord<Commit>>;
  $: commitEntry = commit;
  export let showCommit = false;
  /** syn 0.700 needs the document store to reconstruct a delta commit's state. */
  export let documentStore: DocumentStore<BoardState, BoardEphemeralState>;

  // syn 0.700: Commit.state is a CommitState and most commits are deltas, which
  // carry only the changes since their parent. stateFromCommit() handles the
  // snapshot case only and throws on a delta; resolveCommitState() walks back to
  // the snapshot ancestor and replays forward. It fetches from the DHT, so it is
  // async and the template awaits it.
  const getState = async (entry: EntryRecord<Commit>): Promise<BoardState> => {
    return (await documentStore.resolveCommitState(entry)) as unknown as BoardState
  }
</script>

{#if $commitEntry.status == "pending"}
  ...
{:else if $commitEntry.status == "error"}
  <div class="commit-error">err: {$commitEntry.error}</div>
{:else if $commitEntry.status == "complete"}
  {@const entry = $commitEntry.value}
  <div
    class="commit"
    on:click={() => dispatch("toggle-commit")}
  >
    
    <Avatar size={20} agentPubKey={entry.action.header.author} />
    {store.timeAgo.format(new Date(entry.action.header.timestamp))}
    {#if showCommit}
      {#await getState(entry)}
        <div class="commit-loading">reconstructing state...</div>
      {:then state}
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
      {:catch e}
        <div class="commit-error">err: {e.message}</div>
      {/await}
    {/if}
  </div>
{/if}

<style>
  .columns {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px 0;
    margin-top: 4px;
    max-width: 380px;
  }
  .commit-loading {
    max-width: 380px;
    font-size: 80%;
    opacity: 0.6;
  }
  .commit-error {
    max-width: 380px;
    word-break: break-word;
    font-size: 80%;
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
