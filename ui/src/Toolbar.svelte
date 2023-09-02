<script lang="ts">
  import Folk from "./Folk.svelte";
  import type { ProfilesStore } from "@holochain-open-dev/profiles";
  import { faBug, faBars, faClose} from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";
  import Search from './Search.svelte';
  import { getContext } from "svelte";
  import AboutDialog from "./AboutDialog.svelte";
  import KDLogoIcon from "./icons/KDLogoIcon.svelte";
  import type { KanDoStore } from "./kanDoStore";

  const { getStore } :any = getContext("kdStore");
  let store: KanDoStore = getStore();

  $: uiProps = store.uiProps
  $: activeHash = store.boardList.activeBoardHash;

  export let profilesStore: ProfilesStore|undefined

  $:bugColor = "color: #5536f9"

  let aboutDialog

</script>
<AboutDialog bind:this={aboutDialog} />

<div class='toolbar'>
  <div class="items">
    <div class="logo" title="About KanDo!" on:click={()=>aboutDialog.open()}><KDLogoIcon /></div>


    {#if $activeHash}
      {#if $uiProps.showMenu}
        <span style="display:flex;align-items:center;cursor:pointer" on:click={()=>{store.setUIprops({showMenu:false})}}><div class="close"  title="Hide Board Menu"><Fa icon={faClose} size=2x /></div></span>

      {:else}
        <div class="nav-button" on:click={()=>{store.setUIprops({showMenu:true})}}  title="Show Board Menu"><Fa color="#fff" icon={faBars} size=2x /></div>
      {/if}
    {/if}
    
  </div>
  <div class="items"><Search></Search></div>
  <div class="items">
    <Folk profilesStore={profilesStore}></Folk>
    <a href="https://github.com/holochain-apps/kando/issues" title="Report a problem in our GitHub repo" target="_blank">
      <div class="nav-button"><Fa color="#fff" icon={faBug} size=2x style={bugColor} /></div>
    </a>
  </div>
</div>

<style>
  .logo {
    height: 20px;
    margin-left: 10px;
    margin-right: 10px;
    display: contents;
    cursor: pointer;
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
    display: flex;
  }

  .close {
    color: #fff;
  }

  .items {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
  
</style>