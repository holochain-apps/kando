<script lang="ts">
  import { getContext } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
  import "@shoelace-style/shoelace/dist/components/menu/menu.js";
  import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";

  export const UNCATEGORIZED = "__uncategorized__"

  export let selected: Array<string> = []
  export let setSelected: (s: Array<string>) => void

  const { getStore }: any = getContext("store");
  let store: KanDoStore = getStore();

  $: activeBoard = store.boardList.activeBoard;
  $: state = $activeBoard ? $activeBoard.readableState() : undefined

  // Selecting categories is OR. Selecting "Not categorized" is exclusive.
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(c => c !== value))
    } else if (value === UNCATEGORIZED) {
      setSelected([UNCATEGORIZED])
    } else {
      setSelected([...selected.filter(c => c !== UNCATEGORIZED), value])
    }
  }

  const handleSelect = (e: CustomEvent) => {
    const value = e.detail.item.value
    if (value) toggle(value)
  }
</script>

<sl-dropdown class="category-filter" skidding="15" hoist>
  <div
    slot="trigger"
    class="trigger"
    class:active={selected.length > 0}
    title="Filter by category"
  >
    <svg class="grid-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#cf8c83" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="#8aa9d4" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="#d6c47e" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#93bd8c" />
    </svg>
  </div>
  <sl-menu on:sl-select={handleSelect}>
    <sl-menu-item
      type="checkbox"
      value={UNCATEGORIZED}
      checked={selected.includes(UNCATEGORIZED)}
    >
      Not categorized
    </sl-menu-item>
    {#if $state}
      {#each $state.categoryDefs as { type, name, color }}
        <sl-menu-item
          type="checkbox"
          value={type}
          checked={selected.includes(type)}
        >
          <div class="item">
            <span class="swatch" style="background-color: {color}"></span>
            <span class="name">{name}</span>
          </div>
        </sl-menu-item>
      {/each}
    {/if}
  </sl-menu>
</sl-dropdown>

<style>
  .trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    margin-left: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(35, 32, 74, 0.1);
    border-radius: 5px;
    box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
    cursor: pointer;
    transition: all .25s ease;
  }
  .trigger:hover {
    transform: scale(1.1);
  }
  .trigger.active {
    background-color: rgba(32, 32, 137, 1.0);
    color: white;
  }
  .grid-icon {
    display: block;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .swatch {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid rgba(35, 32, 74, 0.2);
  }
  .name {
    font-size: 14px;
  }
</style>
