<script lang="ts">
  import Folk from "./Folk.svelte";
  import type { ProfilesStore } from "@holochain-open-dev/profiles";

  import { faBug, faBars, faClose, faArrowUpFromBracket} from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";
  import Search from './Search.svelte';
  import { getContext } from "svelte";
  import type { KanDoStore } from "./kanDoStore";

  export const IS_HOLO = ['true', '1', 't'].includes(import.meta.env.VITE_APP_IS_HOLO?.toLowerCase())

  const { getStore } :any = getContext("kdStore");
  let store: KanDoStore = getStore();

  $: uiProps = store.uiProps
  $: activeHash = store.boardList.activeBoardHash;

  export let profilesStore: ProfilesStore|undefined
  import type WebSdk from '@holo-host/web-sdk'

  $:bugColor = "color: #5536f9"

  const holoLogout = async () => {
    await (store.client as WebSdk).signOut();
    (store.client as WebSdk).signIn({ cancellable: false })
  }

</script>

<div class='toolbar'>
  <div class="items">
    {#if $activeHash}
      {#if $uiProps.showMenu}
        <span style="display:flex;align-items:center;cursor:pointer" on:click={()=>{store.setUIprops({showMenu:false})}}><div class="close"  title="Hide Board Menu"><Fa icon={faClose} size=2x /></div></span>

      {:else}
        <div class="nav-button open" on:click={()=>{store.setUIprops({showMenu:true})}}  title="Show Board Menu"><Fa color="#fff" icon={faBars} size=2x /></div>
      {/if}
    {/if}
    
  </div>
  <div class="items"><Search></Search></div>
  <div class="items">
    <Folk profilesStore={profilesStore}></Folk>
    <a href="https://github.com/holochain-apps/kando/issues" title="Report a problem in our GitHub repo" target="_blank">
      <div class="nav-button"><Fa color="#fff" icon={faBug} size=2x style={bugColor} /></div>
    </a>
    {#if IS_HOLO}
      <div title="Logout" on:click={() => holoLogout()} class="nav-button"><Fa icon={faArrowUpFromBracket} size=2x  /></div>
    {/if}
  </div>
</div>

<style>
  .board-name {
    font-size: 20px;
  }

  .bug-link {
    padding: 8px 8px;
    display: flex;
    border-radius: 50%;
  }
  a:hover.bug-link {
    background-color: #ddd;
  }
  .toolbar {
    background: linear-gradient(90.1deg, #143C77 4.43%, #261492 99.36%);
    align-items: center;
    justify-content: space-between;
    color: #fff;
    height: 50px;
    position: relative;
    z-index: 250;
    display: flex;
  }

  .close, .open {
    color: #fff;
    margin-left: 15px;
    width: 30px;
    height: 30px;
  }
  
  .open {
    margin-left: 10px;
  }

  .items {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
  
</style>