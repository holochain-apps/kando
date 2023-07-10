<script lang="ts">
    import { Dialog } from 'svelte-materialify';

    export let active = false;

    const handleKeydown = (e) => {
        if (e.key === "Escape") {
            active=false
        }
    }
</script>

<svelte:window on:keydown={handleKeydown}/>

<Dialog bind:active width={600} >
    <div class="about">
        <h5>KanDo!: UI v0.4.3 for DNA v0.3.x</h5>
        <p>KanDo! is a demonstration Holochain app built by Holo.</p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code <a href="https://github.com/holochain-apps/kando">in our github repo</a>.
            This project's real-time syncronization is powered by <a href="https://github.com/holochain/syn">Syn</a>, 
            a library that makes it really easy to build this kind of real-time collaboaration into Holochain apps.
        </p>
    <p class="small">Copyright © 2023 Holochain Foundation.  This software is distributed under the MIT License</p>
    </div>
</Dialog>

<style>
    .about {
        padding: 40px;
    }
    .about h5 {
        margin-bottom: 40px;
    }
    .small {
        font-size: 80%;
    }
</style>
  