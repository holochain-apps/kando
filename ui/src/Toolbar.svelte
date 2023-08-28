<script lang="ts">
  import KDLogoIcon from "./icons/KDLogoIcon.svelte";
  import BoardMenu from "./BoardMenu.svelte";
  import Folk from "./Folk.svelte";
  import AboutDialog from "./AboutDialog.svelte";
  import type { ProfilesStore } from "@holochain-open-dev/profiles";
  import { faArrowUpFromBracket, faBug } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";
  import IS_HOLO from "./App.svelte"
  import { getContext } from "svelte";
  import type { KanDoStore } from "./kanDoStore";
  export let profilesStore: ProfilesStore|undefined
  import type WebSdk from '@holo-host/web-sdk'

  let aboutDialog
  $:bugColor = "color: #5536f9"
  const { getStore } :any = getContext("kdStore");
  let kdStore: KanDoStore = getStore();

  const holoLogout = async () => {
    await (kdStore.client as WebSdk).signOut();
    (kdStore.client as WebSdk).signIn({ cancellable: false })
  }

</script>

  <AboutDialog bind:this={aboutDialog} />
<div class='toolbar'>
  <div class="left-items">
    <div class="logo" title="About KanDo!" on:click={()=>aboutDialog.open()}><KDLogoIcon /></div>
    <BoardMenu ></BoardMenu>
  </div>
  <div class="right-items">
    <Folk profilesStore={profilesStore}></Folk>
    <a href="https://github.com/holochain-apps/kando/issues" title="Report a problem in our GitHub repo" target="_blank">
      <div class="nav-button"><Fa icon={faBug} size=2x style={bugColor} /></div>
    </a>
    {#if IS_HOLO}
      <div title="Logout" on:click={() => holoLogout()} class="nav-button"><Fa icon={faArrowUpFromBracket} size=2x  /></div>
    {/if}
  </div>
</div>

<style>
  .bug-link {
    padding: 8px 8px;
    display: flex;
    border-radius: 50%;
  }
  a:hover.bug-link {
    background-color: #ddd;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #eeeeee;
    padding-left: 15px;
    padding-right: 10px;
    padding-top: 16px;
    padding-bottom: 16px;
  }
  .logo {
    height: 40px;
    margin-right: 10px;
    display: contents;
    cursor: pointer;
  }
  .logo-text {
    padding-bottom: 5px;
    margin-left: 15px;
  }
  .right-items {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
  .left-items {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
</style>