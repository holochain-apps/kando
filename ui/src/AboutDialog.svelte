<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import { KanDoCloneManagerStore } from './stores/cloneManager';
    import { getContext } from 'svelte';
    import { encodeHashToBase64 } from '@holochain/client';

    let dialog
    export const open = ()=>{dialog.show()}

    const { getStore }: any = getContext('cloneManagerStore');
    let cloneManagerStore: KanDoCloneManagerStore = getStore();
  
    $: activeDnaHash = cloneManagerStore.activeDnaHash;
    $: activeDnaHashB64 = encodeHashToBase64($activeDnaHash);
</script>


<sl-dialog label="KanDo!" bind:this={dialog} width={600} >
    <div class="about">
        <p>KanDo! is a demonstration Holochain app built by the Holochain Foundation.</p>
        <p><b>Version:</b> UI {__APP_VERSION__}; DNA {__DNA_VERSION__}</p>
        <p><b>Active Network DNA Hash:</b> <br /><span style="font-size: 0.8rem">{activeDnaHashB64}</span></p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code in our <a href="https://github.com/holochain-apps/kando">github repo</a>.
            This project's real-time syncronization is powered by <a href="https://github.com/holochain/syn">Syn</a>, 
            a library that makes it really easy to build this kind of real-time collaboaration into Holochain apps.
        </p>
    <p class="small">Copyright © 2023-2025 Holochain Foundation.  This software is distributed under the MIT License</p>
    
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
    a {
        text-decoration:underline
    }
</style>
  