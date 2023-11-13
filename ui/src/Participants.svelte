<script lang="ts">
 
  import Avatar from "./Avatar.svelte";
  import type { Board } from "./board";

  export let board: Board

  $: participants = board ? board.sessionParticipants() : undefined

  export let size:number = 24;

</script>
<div class="wrapper"
    class:bordered={false}  >
    {#if $participants && $participants.status=="complete"}

        {#each Array.from($participants.value) as agentPubKey}
          <Avatar size={size} agentPubKey={agentPubKey} showNickname={false} />
        {/each}

    {/if}
</div>
<style>
  .bordered {
    border: solid 1px gray;
  }
  .wrapper {
    border-radius: 50%;
    display: flex;
    flex-direction: row
  }
</style>