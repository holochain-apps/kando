<script lang="ts">
  import { decodeHashFromBase64 } from "@holochain/client";
  import Avatar from "./Avatar.svelte";
  import {
    _getCard,
    _getGroup,
    getDeltaCardData,
    type BoardState,
    type FeedItem,
  } from "./board";
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./store";
  import type { Readable } from "svelte/store";

  const dispatch = createEventDispatcher()

  const { getStore }: any = getContext("store");
  let store: KanDoStore = getStore();

  export let state: Readable<BoardState>;
  export let items: Array<FeedItem>;

  const getCard = (id) => {
    const c = _getCard($state, id);
    if (c) {
      const [card, i] = c;
      if (card) {
        return card;
      }
    }
  };

  const getGroup = (id) => {
    const g = _getGroup($state, id);
    if (g) {
      const [group, i] = g;
      if (group) {
        return group;
      }
    }
  };

  const getCardData = (item: FeedItem) => {
    const delta = item.content.delta
    return getDeltaCardData($state, delta)
  }

</script>
{#if items}
{@const [cardId, cardTitle] = getCardData(items[0])}
<div class="feed-item">
  {#if cardId}
    
    <span class="card-header">
      Card {#if cardId}<span class="card-sel" on:click={()=>dispatch("select-card", cardId)}> {cardTitle}</span>{:else}<span class="card-sel">Unknown Card</span>{/if}
    </span>
  {/if}
{#each items as item}
{@const  delta = item.content.delta}
{@const context = item.content.context}
  <div class="item"
  class:multiple = {cardId}
  >
  <Avatar
    agentPubKey={decodeHashFromBase64(item.author)}
    showNickname={false}
    size={20}
  />
  <span>
    {#if delta.type == "create"}
      created board {delta.name}
    {/if}
    {#if delta.type == "set-status"}
      set the board status to {delta.status}
    {/if}
    {#if delta.type == "set-state"}
      set the board
    {/if}
    {#if delta.type == "set-name"}
      set the board name to {delta.name}
    {/if}
    {#if delta.type == "set-props"}
      updated the board settings
    {/if}
    {#if delta.type == "add-group"}
      added column <strong>{delta.group.name}</strong>
    {/if}
    {#if delta.type == "set-groups"}
      updated the columns
    {/if}
    {#if delta.type == "set-group-order"}
      reorded the columns
    {/if}
    {#if delta.type == "set-label-defs"}
      updated the labels
    {/if}
    {#if delta.type == "set-category-defs"}
      updated the categories
    {/if}
    {#if delta.type == "add-card"}
      added
      {context
        ? `to ${context.group.name}`
        : ""}
    {/if}
    {#if delta.type == "update-card-group"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const group = getGroup(delta.group)}
        {#if group}
          moved to <strong>{group.name}</strong>
        {:else}
          moved to deleted group
        {/if}
      {:else}
        moved card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "update-card-props"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated
      {:else}
        updated card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "set-card-agents"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated assignees
      {:else}
        updated card <span class="deleted-card">{context.card}</span> assignees
      {/if}
      to:
      {#each delta.agents as agent}
        <Avatar
          agentPubKey={decodeHashFromBase64(agent)}
          showNickname={false}
          size={20}
        />
      {/each}
    {/if}
    {#if delta.type == "add-card-comment"}
      {@const card = getCard(delta.id)}
      {#if card}
        added comment
      {:else}
        added a comment to card <span class="deleted-card">{context.card}</span>
      {/if}{/if}
    {#if delta.type == "update-card-comment"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated comment
      {:else}
        updated a comment on card <span class="deleted-card">{context.card}</span>
      {/if}{/if}
    {#if delta.type == "delete-card-comment"}
      {@const card = getCard(delta.id)}
      {#if card}
        deleted comment
      {:else}
        deleted a comment on card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "add-card-checklist"}
      {@const card = getCard(delta.id)}
      {#if card}
        added a checklist "{delta.checklist.title}"
      {:else}
        added a checklist "{delta.checklist.title}" to card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "update-card-checklist"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated checklist {delta.title}
      {:else}
        updated a checklist {delta.title} on card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "add-checklist-item"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        added item "{delta.item.text}"
        {list ? `:${list.title}` : ""}
      {:else}
        added checklist item {delta.item.text} to card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "delete-checklist-item"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        {#if list}
          deleted item "{context.item}" from <strong>{list.title}</strong>
        {:else}
          deleted a checklist item "{context.item}"
        {/if}
      {:else}
        deleted a checklist item from card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "set-checklist-item-state"}
      {@const itemStateStr = delta.state ? "Checked" : "Unchecked"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        {#if list}
          {@const item = list.items[delta.itemId]}
          set item {item ? ` "${item.text}"` : ""} <strong>{list.title}</strong> 
          to {itemStateStr}
        {:else}
          set item from deleted checklist
          to {itemStateStr}
      {/if}
      {:else}
        set item a checklist item from card <span class="deleted-card">{context.card}</span> to {itemStateStr}
      {/if}
    {/if}
    {#if delta.type == "convert-checklist-item"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        {#if list}
          {@const item = list.items[delta.itemId]}
          converted item "{context.item}" from <strong>{list.title}</strong>
          to a card
        {:else}
          converted item "{context.item}" from deleted checklist
        {/if}
      {:else}
        converted a checklist item from card <span class="deleted-card">{context.card}</span> to a card
      {/if}
    {/if}
    {#if delta.type == "delete-card-checklist"}
      {@const card = getCard(delta.id)}
      {#if card}
        deleted checklist {context.checklist}
      {:else}
        deleted checklist {context.checklist} on card <span class="deleted-card">{context.card}</span>
      {/if}
    {/if}
    {#if delta.type == "delete-card"}
      deleted card <span class="deleted-card">{context.card}</span>
    {/if}
  </span>
  {store.timeAgo.format(item.timestamp)}
  </div>
  {/each}
</div>
{/if}
<style>
  .card-sel {
    background-color: white;
    padding-left: 4px;
    padding-right: 4px;
    border: solid 1px gray;
    border-radius: 4px;
    cursor: pointer;
  }
  .feed-item {
    display:flex;
    flex-direction: column;
    justify-items: flex-start;
    padding: 4px;
    border-radius: 5px;
    margin-bottom: 5px;
    border: solid 1px blue;
    background-color: rgba(0, 0, 255, 0.1);
    max-width: 370px;
  }
  .card-header {
    display:block;
  }
  .multiple {
    display:inline-block;
    margin-left: 10px;
  }
  .deleted-card {
    font-weight: bold;
  }
</style>
