<script lang="ts">
  import { decodeHashFromBase64 } from "@holochain/client";
  import Avatar from "./Avatar.svelte";
  import {
    _getCard,
    _getGroup,
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
  export let item: FeedItem;



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
</script>
{#if item}
{@const  delta = item.content.delta}
{@const context = item.content.context}
<div class="feed-item">
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
      added column "{delta.group.name}"
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
      added <span class="card-sel" on:click={()=>dispatch("select-card", delta.value.id)}> {delta.value.props.title}</span>
      {context
        ? `to ${context.group.name}`
        : ""}
    {/if}
    {#if delta.type == "update-card-group"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const group = getGroup(delta.group)}
        {#if group}
          moved <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span> to {group.name}
        {:else}
          moved <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
        {/if}
      {:else}
        moved card "{context.card}"
      {/if}
    {/if}
    {#if delta.type == "update-card-props"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
      {:else}
        updated card "{context.card}"
      {/if}
    {/if}
    {#if delta.type == "set-card-agents"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span> assignees
      {:else}
        updated card "{context.card}" assignees
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
        added comment to <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
      {:else}
        added a comment to card "{context.card}"
      {/if}{/if}
    {#if delta.type == "update-card-comment"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated comment on <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
      {:else}
        updated a comment on card "{context.card}"
      {/if}{/if}
    {#if delta.type == "delete-card-comment"}
      {@const card = getCard(delta.id)}
      {#if card}
        deleted comment on <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
      {:else}
        deleted a comment on card "{context.card}"
      {/if}
    {/if}
    {#if delta.type == "add-card-checklist"}
      {@const card = getCard(delta.id)}
      {#if card}
        added a checklist "{delta.checklist.title}" to <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
      {:else}
        added a checklist "{delta.checklist.title}" to card "{context.card}"
      {/if}
    {/if}
    {#if delta.type == "update-card-checklist"}
      {@const card = getCard(delta.id)}
      {#if card}
        updated checklist {delta.title} on <span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
      {:else}
        updated a checklist "{delta.title}" on card "{context.card}"
      {/if}
    {/if}
    {#if delta.type == "add-checklist-item"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        added item "{delta.item.text}" to "<span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>
        {list ? `:${list.title}` : ""}"
      {:else}
        added checklist item {delta.item.text} to card "{context.card}"
      {/if}
    {/if}
    {#if delta.type == "delete-checklist-item"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        {#if list}
          deleted item "{context.item}" from "<span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>:{list.title}"
        {:else}
          deleted a checklist item from card "{context.card}"
        {/if}
      {:else}
        deleted a checklist item from card "{context.card}"
      {/if}
    {/if}
    {#if delta.type == "set-checklist-item-state"}
      {@const itemStateStr = delta.state ? "Checked" : "Unchecked"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        {#if list}
          {@const item = list.items[delta.itemId]}
          set item ${item ? ` "{item.text}"` : ""} on "<span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>: {list.title}"
          to {itemStateStr}
        {/if}
      {:else}
        set item a checklist item from card "{context.card}" to {itemStateStr}
      {/if}
    {/if}
    {#if delta.type == "convert-checklist-item"}
      {@const card = getCard(delta.id)}
      {#if card}
        {@const list = card.checklists[delta.checklistId]}
        {#if list}
          {@const item = list.items[delta.itemId]}
          converted item "{context.item}" from "<span class="card-sel" on:click={()=>dispatch("select-card", card.id)}> {card.props.title}</span>: {list.title}"
          to a card
        {/if}
      {:else}
        converted a checklist item from card "{context.card}" to a card
      {/if}
    {/if}
    {#if delta.type == "delete-card-checklist"}
      deleted checklist {context.checklist} on card "{context.card}"
    {/if}
    {#if delta.type == "delete-card"}
      deleted card "{context.card}"
    {/if}
  </span>
  {store.timeAgo.format(item.timestamp)}
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
    padding: 4px;
    border-radius: 5px;
    margin-bottom: 5px;
    border: solid 1px blue;
    background-color: rgba(0, 0, 255, 0.1);
    max-width: 370px;
  }
</style>
