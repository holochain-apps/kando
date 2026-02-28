<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { type CellInfoNormalized, KanDoCloneManagerStore } from "./stores/cloneManager";
  import { hashEqual } from "./utils/util";
  import { get } from "svelte/store";
  import SvgIcon from "./SvgIcon.svelte";
  import CloneManagerDialog from "./CloneManagerDialog.svelte";
  import CloneManagerCreateDialog from "./CloneManagerCreateDialog.svelte";
  import CloneManagerJoinDialog from "./CloneManagerJoinDialog.svelte";
  import { type DnaJoiningInfo } from "./utils/dnaJoiningInfo";

  const { getStore }: any = getContext('cloneManagerStore');
  let cloneManagerStore: KanDoCloneManagerStore = getStore();

  let clones: CellInfoNormalized[] = [];
  let cloneManagerDialog;
  let newCloneDialog;
  let joinCloneDialog;

  $: activeDnaHash = cloneManagerStore.activeDnaHash;

  async function loadClones() {
    clones = await cloneManagerStore.listEnabledClones();
  }

  // Reload when activeDnaHash changes (e.g. after creating/joining)
  $: if ($activeDnaHash) {
    loadClones();
  }

  onMount(() => {
    loadClones();
  });

  const isActive = (clone: CellInfoNormalized) =>
    hashEqual(get(cloneManagerStore.activeDnaHash), clone.cellId[0]);

  const switchTo = (clone: CellInfoNormalized) => {
    cloneManagerStore.activate(clone.cellId);
  };

  const create = async (name: string, _useDefaultProfile: boolean) => {
    const cell = await cloneManagerStore.create(name);
    cloneManagerStore.activate(cell.cell_id);
    await loadClones();
  };

  const join = async (joiningCode: DnaJoiningInfo, _useDefaultProfile: boolean) => {
    const cell = await cloneManagerStore.join(joiningCode.name, joiningCode.networkSeed);
    cloneManagerStore.activate(cell.cell_id);
    await loadClones();
  };
</script>

{#if clones.length >= 2}
  <div class="network-tabs">
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
    <div class="tab-actions">
      <button class="tab-action" title="Add Network" on:click={() => newCloneDialog.open()}>
        <SvgIcon icon="faSquarePlus" size="14px" color="#fff"/>
      </button>
      <button class="tab-action" title="Manage Networks" on:click={() => cloneManagerDialog.open()}>
        <SvgIcon icon="faCog" size="14px" color="#fff"/>
      </button>
    </div>
  </div>
{:else}
  <div class="network-single-actions">
    {#if clones.length === 1}
      <span class="current-network">{clones[0].displayName}</span>
    {/if}
    <button class="tab-action" title="Add Network" on:click={() => newCloneDialog.open()}>
      <SvgIcon icon="faSquarePlus" size="14px" color="#fff"/>
    </button>
    <button class="tab-action" title="Manage Networks" on:click={() => cloneManagerDialog.open()}>
      <SvgIcon icon="faCog" size="14px" color="#fff"/>
    </button>
  </div>
{/if}

<CloneManagerDialog bind:this={cloneManagerDialog} />
<CloneManagerCreateDialog bind:this={newCloneDialog} handleSave={create} />
<CloneManagerJoinDialog bind:this={joinCloneDialog} handleJoin={join} />

<style>
  .network-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    padding: 4px 0;
  }

  .tabs-scroll {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    flex: 1;
    scrollbar-width: none;
  }

  .tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .tab {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    color: rgba(255, 255, 255, 0.7);
    padding: 4px 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .tab:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .tab.active {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }

  .tab-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .tab-action {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-action:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .network-single-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding: 4px 0;
  }

  .current-network {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    font-weight: 600;
    flex: 1;
  }
</style>
