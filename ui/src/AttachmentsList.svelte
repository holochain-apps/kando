<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import { createEventDispatcher, getContext } from "svelte";
  import type { KanDoStore } from "./store";
  import { hrlB64WithContextToRaw } from "./util";
  import { weaveUrlFromWal, type HrlB64WithContext, WeClient } from "@lightningrodlabs/we-applet";
  import SvgIcon from "./SvgIcon.svelte";
  import { hrlToString } from "@holochain-open-dev/utils";
  import '@lightningrodlabs/we-elements/dist/elements/wal-embed.js';

  const dispatch = createEventDispatcher()

  export let attachments: Array<HrlB64WithContext>
  export let allowDelete = true

  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();
  let embedLink

</script>
{#if embedLink>=0 && attachments.length>0}
  <wal-embed
    class="embed"
    style="margin-top: 20px;"
    src={weaveUrlFromWal(hrlB64WithContextToRaw(attachments[embedLink]),false)}
    closable
    on:open-in-sidebar={() => embedLink = -1}
    on:close={() => embedLink = -1}
      ></wal-embed>
{/if}
<div class="attachments-list">
  {#each attachments as attachment, index}
    {@const hrlWithContext = hrlB64WithContextToRaw(attachment)}
    <div 
      class:attachment-item-with-delete={allowDelete}
      class:attachment-item={!allowDelete}
    >
      {#await store.weClient.attachableInfo(hrlWithContext)}
        <div style="cursor:pointer; padding: 0 5px 0 5px; border: dashed 1px;margin-right:5px" title={`${hrlToString(hrlWithContext.hrl)}?${JSON.stringify(hrlWithContext.context)}`}> ?...</div>
      {:then { attachableInfo }}
        <sl-button  size="small"
          on:click={async (e)=>{
              e.stopPropagation()
              try {
//                embedLink = index
                await store.weClient.openHrl(hrlWithContext)
              } catch(e) {
                alert(`Error opening link: ${e}`)
              }
            }}
          style="display:flex;flex-direction:row;margin-right:5px"><sl-icon src={attachableInfo.icon_src} slot="prefix"></sl-icon>
          {attachableInfo.name}
        </sl-button> 
      {:catch error}
        Oops. something's wrong.
      {/await}
      {#if allowDelete}
        <sl-button size="small"
          on:click={()=>{
            dispatch("remove-attachment",index)
          }}
        >
          <SvgIcon icon=faTrash size=12 />
        </sl-button>
      {/if}
</div>
  {/each}
</div>
<style>
  .attachments-list {
    display:flex;
    flex-direction:row;
    flex-wrap: wrap;
    align-items: center;
  }
  .attachment-item {
  }
  .attachment-item-with-delete {
    border:1px solid #aaa; 
    background-color:rgba(0,255,0,.1); 
    padding:4px;
    display:flex;
    margin-right:4px;
    border-radius:4px;
  }
  .embed {
    position: fixed;
    top: 84px;
    z-index: 100;
  }
</style>
