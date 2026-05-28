<script lang="ts">
  import Avatar from './Avatar.svelte'
  import SvgIcon from './SvgIcon.svelte'
  import { getContext } from "svelte";
  import { decodeHashFromBase64, encodeHashToBase64, type AgentPubKeyB64 } from "@holochain/client";
  import type { KanDoStore } from "./stores/kando";
  import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
  import "@shoelace-style/shoelace/dist/components/menu/menu.js";
  import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";

  export const UNASSIGNED = "__unassigned__"

  export let selected: Array<string> = []
  export let setSelected: (s: Array<string>) => void

  const { getStore }: any = getContext("store");
  let store: KanDoStore = getStore();

  $: allProfiles = store.profilesStore.allProfiles

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(a => a !== value))
    } else if (value === UNASSIGNED) {
      setSelected([UNASSIGNED])
    } else {
      setSelected([...selected.filter(a => a !== UNASSIGNED), value])
    }
  }

  const handleSelect = (e: CustomEvent) => {
    const value = e.detail.item.value
    if (value) toggle(value)
  }
</script>

<sl-dropdown class="avatar-filter" skidding="15" hoist>
  <div
    slot="trigger"
    class="trigger"
    class:active={selected.length > 0}
    title="Filter by assigned"
  >
    <SvgIcon icon="faUserGroup" size="18px" color={selected.length > 0 ? "white" : ""} />
  </div>
  <sl-menu on:sl-select={handleSelect}>
    <sl-menu-item
      type="checkbox"
      value={UNASSIGNED}
      checked={selected.includes(UNASSIGNED)}
    >
      Not assigned
    </sl-menu-item>
    {#if $allProfiles.status == "complete"}
      {#each Array.from($allProfiles.value) as [hash, profile]}
        {@const agentB64 = encodeHashToBase64(hash)}
        <sl-menu-item
          type="checkbox"
          value={agentB64}
          checked={selected.includes(agentB64)}
        >
          <div class="item">
            <Avatar
              agentPubKey={decodeHashFromBase64(agentB64)}
              size={20}
              showNickname={false}
            />
            <span class="nickname">{profile.entry.nickname}</span>
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
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .nickname {
    font-size: 14px;
  }
</style>
