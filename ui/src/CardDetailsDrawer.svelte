<script lang="ts">

  import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
  import type { v1 as uuidv1 } from "uuid";
  import { getContext } from 'svelte';
  import type { KanDoStore } from './store';

  import CardDetails from "./CardDetails.svelte";

  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();

  let cardId:uuidv1 = ""

  let dialog
  let details: CardDetails
    
  export const open = (id: uuidv1)=>{
    cardId = id
    details.updateLatestComment()
    dialog.show()
  }

  export const reset = ()=>{
    dialog.hide()
    details.reset()
  }

</script>
<sl-drawer class="edit-card" bind:this={dialog}
  style="--size:500px"
  no-header
  on:sl-hide={()=>dialog.close()}
  >
  <CardDetails bind:this={details} cardId={cardId} />
</sl-drawer>
<style>
  .edit-card::part(base) {
    height: calc(100vh - 97px);
    bottom: 0;
    top: initial;
    z-index: 150;
  }

  .edit-card::part(body) {
    padding: 0;
  }

  .edit-card::part(panel) {
    box-shadow: 0px 10px 15px rgba(35, 32, 74, 0.2);
  }

  .edit-card::part(overlay) {
    display: none;
  }

</style>
