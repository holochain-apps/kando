<script lang="ts">
  import { type AsyncReadable } from "@holochain-open-dev/stores";
  import { EntryRecord } from "@holochain-open-dev/utils";
  import { type Commit } from "@holochain-syn/core";
  import { getContext, createEventDispatcher } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import Avatar from "./Avatar.svelte";
  import { stateFromCommit } from "@holochain-syn/core";
  import {
    decodeHashFromBase64,
    encodeHashToBase64,
    type ActionHash,
  } from "@holochain/client";
  import { hashEqual } from "./utils/util";
  import { group_outros } from "svelte/internal";
  import { _getCard } from "./board";

  const { getStore }: any = getContext("store");
  let store: KanDoStore = getStore();
  const dispatch = createEventDispatcher();

  export let commit: AsyncReadable<EntryRecord<Commit>>;
  $: commitEntry = commit;
  let showCommit = {};
</script>

{#if $commitEntry.status == "pending"}
  ...
{:else if $commitEntry.status == "error"}
  err:{$commitEntry.error}
{:else if $commitEntry.status == "complete"}
  {@const entry = $commitEntry.value}
  {@const state = stateFromCommit(entry.entry)}
  <div
    class="commit"
    on:click={() => {
      const h = encodeHashToBase64(entry.actionHash);
      if (!showCommit[h]) showCommit[h] = true;
      else showCommit[h] = undefined;
    }}
  >
    <Avatar size={20} agentPubKey={entry.action.author} />
    {store.timeAgo.format(new Date(entry.action.timestamp))}
    {#if showCommit[encodeHashToBase64(entry.actionHash)]}
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
            <div>
              {#if group.id == "_"}
                Archive
              {:else}
                {group.name}
              {/if}
            </div>
            {#if grouping}
              {#each grouping as cardId}
                {@const [card, idx] = _getCard(state, cardId)}
                <div class="card-item" title={card.props.description}>
                  {card.props.title}
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
  }
  .column {
    padding: 5px;
  }
  .commit {
    cursor: pointer;
    padding: 4px;
    margin: 4px;
    border-radius: 5px;
    background-color: lightblue;
  }
</style>
