<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import { decodeDnaJoiningCode } from "./util";
    import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
    import { createEventDispatcher } from 'svelte';

    let dialog: SlDialog;
    export const open = ()=> {
        dialog.show()
    }
    let joiningCode = "";

    const dispatch = createEventDispatcher();
    
    const dispatchJoin = () => {
        dispatch('join', decodeDnaJoiningCode(joiningCode));
        joiningCode = "";
        dialog.hide();
    };
</script>

<sl-dialog label="Join Network" bind:this={dialog} width={1000}>
    <div style="display: flex; flex-direction: column; ">
        <p>Enter a joining code below to join a Kando Network.</p>
        <sl-textarea style="margin-top: 10px;" value={joiningCode} on:sl-input={(e) => joiningCode = e.target.value}></sl-textarea>
        <sl-button style="margin-top: 10px;" on:click={dispatchJoin} on:keydown={dispatchJoin}>Join</sl-button>
    </div>
</sl-dialog>
