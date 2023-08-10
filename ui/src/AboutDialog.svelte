<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    let dialog
    export const open = ()=>{dialog.show()}
</script>


<sl-dialog label="KanDo!: UI v0.4.3 for DNA v0.3.x" bind:this={dialog} width={600} >
    <div class="about">
        <p>KanDo! is a demonstration Holochain app built by Holo.</p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code <a href="https://github.com/holochain-apps/kando">in our github repo</a>.
            This project's real-time syncronization is powered by <a href="https://github.com/holochain/syn">Syn</a>, 
            a library that makes it really easy to build this kind of real-time collaboaration into Holochain apps.
        </p>
    <p class="small">Copyright © 2023 Holochain Foundation.  This software is distributed under the MIT License</p>
    </div>
</sl-dialog>

<style>
    .about {
        background-color: white;
    }
    .about p {

        margin-bottom:10px;
     }
     .small {
        font-size: 80%;
    }
</style>
  