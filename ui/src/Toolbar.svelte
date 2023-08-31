<script lang="ts">
  import Folk from "./Folk.svelte";
  import type { ProfilesStore } from "@holochain-open-dev/profiles";
  import { faBug, faBars, faClose} from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";
  import Search from './Search.svelte';
  import { createEventDispatcher } from "svelte";

  export let profilesStore: ProfilesStore|undefined
  const dispatch = createEventDispatcher()

  $:bugColor = "color: #5536f9"

  let showBoardMenu = false

</script>

<div class='toolbar'>
  <div class="left-items">
    {#if showBoardMenu}
      <span style="display:flex;align-items:center;cursor:pointer" on:click={()=>{dispatch("hideBoardMenu"); showBoardMenu=false}}>Close Menu <div class="nav-button"  title="Hide Board Menu"><Fa icon={faClose} size=2x /></div></span>

    {:else}
      <div class="nav-button" on:click={()=>{dispatch("showBoardMenu", undefined); showBoardMenu=true}}  title="Show Board Menu"><Fa icon={faBars} size=2x /></div>
    {/if}

    <Search></Search>
  </div>
  <div class="right-items">
    <Folk profilesStore={profilesStore}></Folk>
    <a href="https://github.com/holochain-apps/kando/issues" title="Report a problem in our GitHub repo" target="_blank">
      <div class="nav-button"><Fa icon={faBug} size=2x style={bugColor} /></div>
    </a>
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
    background: linear-gradient(90.1deg, #143C77 4.43%, #261492 99.36%);
    align-items: center;
    justify-content: space-between;
    color: #fff;
    height: 50px;
    display: flex;
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