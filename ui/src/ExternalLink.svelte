<script lang="ts">
  import { open } from '@tauri-apps/plugin-shell';
  import { isTauriContext } from './utils/util';

  export let href: string;
  export let title: string;
</script>

{#if isTauriContext()}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-missing-attribute -->
  <a {title} on:click={() => open(href)}><slot></slot></a>
{:else}
  <a {href} {title} target="_blank" ><slot></slot></a>
{/if}