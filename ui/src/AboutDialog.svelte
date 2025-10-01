<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
  import { KanDoCloneManagerStore } from "./stores/cloneManager";
  import { getContext } from "svelte";
  import { encodeHashToBase64 } from "@holochain/client";
  import { KanDoStore } from "./stores/kando";
  import { pipe } from "@holochain-open-dev/stores";
  import Avatar from './Avatar.svelte';

  let dialog;
  export const open = () => {
    dialog.show();
  };
  const { getStore }: any = getContext("cloneManagerStore");
  let cloneManagerStore: KanDoCloneManagerStore = getStore();

  const { getStore: getKDStore }: any = getContext("store");
  const store: KanDoStore = getKDStore();

  $: activeDnaHash = cloneManagerStore.activeDnaHash;
  $: info = cloneManagerStore.activeCellInfoNormalized;
  $: activeDnaHashB64 = encodeHashToBase64($activeDnaHash);
  $: activeSeed = $info.networkSeed;

  const aonAgents = pipe(store.profilesStore.allProfiles, (agents) => {
    return Array.from(agents.entries()).filter(([key, profile]) =>
      profile.entry.nickname.endsWith("-aon")
    );
  });
</script>

<sl-dialog label="KanDo!" bind:this={dialog} width={600}>
  <div class="about">
    <p>
      KanDo! is a demonstration Holochain app built by the Holochain Foundation.
    </p>
    <p><b>Version:</b> UI {__APP_VERSION__}; DNA {__DNA_VERSION__}</p>
    <p>
      <b>Active Network DNA Hash:</b> <br /><span style="font-size: 0.8rem"
        >{activeDnaHashB64}</span
      >
    </p>
    <p>
      <b>Active Network Seed:</b> <br />
      {#if activeSeed}
        <span style="font-size: 0.8rem">{activeSeed}</span>
      {:else}
        <span style="font-size: 0.8rem; color: green;"
          >Public Network, no seed!</span
        >
      {/if}
    </p>
    {#if $aonAgents.status == "complete" && $aonAgents.value.length>0}
    <p>
        <b>Allways-on Nodes:</b> <br />
              {#each $aonAgents.value as agent}
        <span style="font-size: 0.8rem; margin-right:5px;"> <Avatar size={16}  agentPubKey={agent[0]}/> </span>
      {/each}

    </p>
    {/if}

    <p>
      <b>Developers:</b>
      Check out this hApp's source-code in our
      <a href="https://github.com/holochain-apps/kando">github repo</a>. This
      project's real-time syncronization is powered by
      <a href="https://github.com/holochain/syn">Syn</a>, a library that makes
      it really easy to build this kind of real-time collaboaration into
      Holochain apps.
    </p>
    <p class="small">
      Copyright © 2023-2025 Holochain Foundation. This software is distributed
      under the MIT License
    </p>
  </div>
</sl-dialog>

<style>
  .about {
    background-color: white;
  }
  .about p {
    margin-bottom: 10px;
  }
  .small {
    font-size: 80%;
  }
  a {
    text-decoration: underline;
  }
</style>
