<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
  import SvgIcon from './SvgIcon.svelte';
  import KDLogoIcon from "./icons/KDLogoIcon.svelte";
  import type { KanDoCloneManagerStore } from "./stores/cloneManager";
  import { decodeDnaJoiningInfo } from "./utils/dnaJoiningInfo";
  import { loadDefaultProfile } from "./utils/defaultProfile";

  export let cloneManagerStore: KanDoCloneManagerStore;

  const dispatch = createEventDispatcher();

  let mode: 'choose' | 'create' | 'join' = 'choose';
  let networkName = "";
  let joiningCode = "";
  let useDefaultProfile = true;
  let saving = false;
  let error: string | undefined;

  $: hasDefaultProfile = loadDefaultProfile() !== null;
  $: createValid = networkName.length > 0;
  $: joinValid = joiningCode.length > 0;

  async function handleCreate() {
    saving = true;
    error = undefined;
    try {
      const cloneCell = await cloneManagerStore.create(networkName);
      cloneManagerStore.activate(cloneCell.cell_id);
      cloneManagerStore.needsOnboarding.set(false);
      dispatch('complete', { useDefaultProfile: useDefaultProfile && hasDefaultProfile });
    } catch (e) {
      error = `${e}`;
    }
    saving = false;
  }

  async function handleJoin() {
    saving = true;
    error = undefined;
    try {
      const info = decodeDnaJoiningInfo(joiningCode);
      const cloneCell = await cloneManagerStore.join(info.name, info.networkSeed);
      cloneManagerStore.activate(cloneCell.cell_id);
      cloneManagerStore.needsOnboarding.set(false);
      dispatch('complete', { useDefaultProfile: useDefaultProfile && hasDefaultProfile });
    } catch (e) {
      error = `${e}`;
    }
    saving = false;
  }
</script>

<div class="onboarding">
  <div class="logo-area">
    <KDLogoIcon />
  </div>

  <h2>Welcome to KanDo</h2>
  <p class="subtitle">Get started by creating a new network or joining an existing one.</p>

  {#if mode === 'choose'}
    <div class="choices">
      <div class="choice-card" on:click={() => mode = 'create'} on:keydown={() => mode = 'create'}>
        <SvgIcon icon="faSquarePlus" size="32px" color="#fff"/>
        <h3>Create a Network</h3>
        <p>Start a new collaboration space</p>
      </div>
      <div class="choice-card" on:click={() => mode = 'join'} on:keydown={() => mode = 'join'}>
        <SvgIcon icon="personMail" size="32px" color="#fff"/>
        <h3>Join a Network</h3>
        <p>Enter a joining code from someone else</p>
      </div>
    </div>

  {:else if mode === 'create'}
    <div class="form">
      <div class="form-field">
        <label>Network Name</label>
        <sl-input
          maxlength="60"
          value={networkName}
          placeholder="e.g. My Team"
          on:input={e => networkName = e.target.value}
        ></sl-input>
      </div>

      {#if hasDefaultProfile}
        <sl-checkbox checked={useDefaultProfile} on:sl-change={e => useDefaultProfile = e.target.checked}>
          Use default profile
        </sl-checkbox>
      {/if}

      {#if error}
        <div class="error">Error: {error}</div>
      {/if}

      <div class="controls">
        <sl-button on:click={() => { mode = 'choose'; error = undefined; }}>Back</sl-button>
        <sl-button
          variant="primary"
          disabled={!createValid || saving}
          on:click={handleCreate}
        >
          {#if saving}
            <div class="spinning"><SvgIcon icon="faSpinner" /></div>
          {:else}
            Create
          {/if}
        </sl-button>
      </div>
    </div>

  {:else if mode === 'join'}
    <div class="form">
      <div class="form-field">
        <label>Joining Code</label>
        <sl-input
          value={joiningCode}
          placeholder="Paste your joining code here"
          on:input={e => joiningCode = e.target.value}
        ></sl-input>
      </div>

      {#if hasDefaultProfile}
        <sl-checkbox checked={useDefaultProfile} on:sl-change={e => useDefaultProfile = e.target.checked}>
          Use default profile
        </sl-checkbox>
      {/if}

      {#if error}
        <div class="error">Error: {error}</div>
      {/if}

      <div class="controls">
        <sl-button on:click={() => { mode = 'choose'; error = undefined; }}>Back</sl-button>
        <sl-button
          variant="primary"
          disabled={!joinValid || saving}
          on:click={handleJoin}
        >
          {#if saving}
            <div class="spinning"><SvgIcon icon="faSpinner" /></div>
          {:else}
            Join
          {/if}
        </sl-button>
      </div>
    </div>
  {/if}
</div>

<style>
  .onboarding {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #164B9A 0%, #5B47D6 100%);
    color: #fff;
    padding: 40px;
  }

  .logo-area {
    margin-bottom: 20px;
    width: 200px;
  }

  h2 {
    font-size: 28px;
    margin: 0 0 8px 0;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    font-size: 16px;
    opacity: 1;
    margin: 0 0 40px 0;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .choices {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .choice-card {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 30px;
    width: 220px;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .choice-card:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .choice-card h3 {
    margin: 15px 0 8px 0;
    font-size: 18px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .choice-card p {
    margin: 0;
    font-size: 14px;
    opacity: 1;
    color: rgba(255, 255, 255, 0.9);
  }

  .form {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 30px;
    width: 400px;
    max-width: 90vw;
  }

  .form-field {
    margin-bottom: 20px;
  }

  .form-field label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    font-size: 14px;
  }

  .controls {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .error {
    color: #ff6b6b;
    margin-top: 10px;
    font-size: 14px;
  }
</style>
