<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./store";
  import type { Board } from "./board";
  import SvgIcon from "./SvgIcon.svelte";

  export let activeBoard: Board

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();
  let attachmentTypes = Array.from(store.weClient.attachmentTypes.entries())
  export const refresh = () => {
    attachmentTypes = Array.from(store.weClient.attachmentTypes.entries())
  }  
</script>

<div>
    <h3>Create Attachment From:</h3>
    {#each attachmentTypes as [hash, record]}
        <div>
        {#await store.weClient.appletInfo(hash)}
        ...
        {:then appletInfo}
            <strong>{appletInfo.appletName}:</strong>
        {:catch error}
            {error}
        {/await}
        {#each Object.values(record) as aType}
        <sl-icon src={aType.icon_src}></sl-icon>{aType.label}
        <button class="control" on:click={async ()=>{
            const hrl = await aType.create({hrl:[store.dnaHash,activeBoard.hash],context:""})
            dispatch("add-binding",hrl)
            }} >          
            <SvgIcon icon=faPlus size=12/>
        </button>
        {/each}
        </div>
    {/each}
</div>
<style>
</style>