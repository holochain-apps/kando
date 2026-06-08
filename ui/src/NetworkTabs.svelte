<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { CellInfoNormalized, KanDoCloneManagerStore } from "./stores/cloneManager";
  import { hashEqual } from "./utils/util";
  import { get } from "svelte/store";

  const { getStore }: any = getContext('cloneManagerStore');
  let cloneManagerStore: KanDoCloneManagerStore = getStore();

  let clones: CellInfoNormalized[] = [];

  export async function loadClones() {
    clones = await cloneManagerStore.listEnabledClones();
  }

  onMount(() => {
    loadClones();
  });

  const isActive = (clone: CellInfoNormalized) =>
    hashEqual(get(cloneManagerStore.activeDnaHash), clone.cellId[0]);

  const switchTo = (clone: CellInfoNormalized) => {
    cloneManagerStore.activate(clone.cellId);
  };
</script>

<div class="tabs-scroll">
  {#each clones as clone}
    <button
      class="tab"
      class:active={isActive(clone)}
      on:click={() => switchTo(clone)}
      title={clone.displayName}
    >
      {clone.displayName}
    </button>
  {/each}
</div>

<style>
  .tabs-scroll {
    display: flex;
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
    align-items: stretch;
    align-self: stretch;
    margin-top: -1px;
    margin-left: 10px;
    flex: 1;
    min-width: 0;
  }

  .tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .tab {
    background: transparent;
    border: 1px solid transparent;
    border-top: 1px solid transparent;
    border-radius: 0 0 6px 6px;
    color: rgba(255, 255, 255, 0.5);
    padding: 0 10px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
  }

  .tab:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.08);
  }

  .tab.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    border-top: 1px solid rgba(23, 55, 123, .9);
    color: #fff;
    font-weight: 600;
  }
</style>
