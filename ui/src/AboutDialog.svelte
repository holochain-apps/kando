<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

    let dialog
    export const open = ()=>{dialog.show()}
</script>


<sl-dialog label="KanDo!: UI v0.11.2 for DNA v0.10.0-dev.0" bind:this={dialog} width={600} >
    <div class="about">
        <p>KanDo! is a demonstration Holochain app built by the Holochain Foundation.</p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code <a href="https://github.com/holochain-apps/kando">in our github repo</a>.
            This project's real-time syncronization is powered by <a href="https://github.com/holochain/syn">Syn</a>, 
            a library that makes it really easy to build this kind of real-time collaboaration into Holochain apps.
        </p>
    <p class="small">Copyright © 2023-2024 Holochain Foundation.  This software is distributed under the MIT License</p>
    
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
     .export-import {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        height: 50px;
        background: #243076;
        border: 1px solid #4A559D;
        margin-top: 5px;
        color: #fff;
        display: flex;
        align-items: center;
        border-radius: 5px;
        cursor: pointer;
    }

    .export-import span {
        color: #fff;
        display: block;
        padding: 0 15px;
    }
</style>
  