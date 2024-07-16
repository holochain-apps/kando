<script lang="ts">
  import { onMount } from "svelte";
  import { type } from "@tauri-apps/plugin-os";

  // See
  export let os: string | string[] = [];
  
  $: disabled = (Array.isArray(os) && os.includes(osType))
    || (typeof os === "string" && os === osType);

  let osType;
  onMount(async () => osType = await type());
</script>

{#if !disabled}
  <slot></slot>
{/if}