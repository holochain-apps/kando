<script lang="ts">
  import Folk from "./Folk.svelte";
  import Search from './Search.svelte';
  import { getContext } from "svelte";
  import { KanDoStore } from "./stores/kando";
  import SvgIcon from "./SvgIcon.svelte";
  import ExternalLink from './ExternalLink.svelte';
  
  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();

  $: uiProps = store.uiProps
  $: activeHash = store.boardList.activeBoardHash;
</script>

<div class='toolbar'>
  <div class="items">
    {#if $activeHash}
      {#if $uiProps.showMenu}
        <span style="display:flex;align-items:center;cursor:pointer" on:click={()=>{store.setUIprops({showMenu:false})}}><div class="close"  title="Hide Board Menu"><SvgIcon icon="faClose" size="20px" color="#fff" /></div></span>
      {:else}
        <div class="nav-button open" on:click={()=>{store.setUIprops({showMenu:true})}}  title="Show Board Menu"><SvgIcon size="20px" icon="faBars" color="#fff" /></div>
      {/if}
    {/if}
  </div>
  <div class="items"><Search></Search></div>
  <div class="items">
    <Folk></Folk>
    <ExternalLink href="https://github.com/holochain-apps/kando/issues" title="Report a problem in our GitHub repo">
      <div class="nav-button"><SvgIcon color="#fff" icon="faBug" size=20px /></div>
    </ExternalLink>
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