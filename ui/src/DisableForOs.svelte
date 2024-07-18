<script lang="ts">
  import { onMount } from "svelte";
  import { OsType, type } from "@tauri-apps/plugin-os";

  export let os: OsType | OsType[] = [];
  
  $: disabled = (Array.isArray(os) && os.includes(osType))
    || (typeof os === "string" && os === osType);

  let osType;
  onMount(async () => osType = await type());
</script>

{#if !disabled}
  <slot></slot>
{/if}