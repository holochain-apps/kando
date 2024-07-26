<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import { type CellInfoNormalized } from "./store";
    import { encodeDnaJoiningCode } from "./util";
    import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

    let dialog: SlDialog;
    export let cell: CellInfoNormalized | undefined;
    export const open = ()=> {
        dialog.show()
    }

    $: joiningCode = cell ? encodeDnaJoiningCode(cell.name, cell.networkSeed) : "";

    const copyJoiningCode = () => {
        navigator.clipboard.writeText(joiningCode);
        dialog.hide();
    };
</script>

<sl-dialog label="Share Network" bind:this={dialog} width={1000}>
    <div style="display: flex; flex-direction: column; ">
        <p>Share this code with a friend to grant them access to the Kando Network <b>{cell?.name}</b></p>
        <textarea style="margin-top: 10px;">{joiningCode}</textarea>
        <sl-button style="margin-top: 10px;" on:keydown={copyJoiningCode} on:click={copyJoiningCode}>Copy Joining Code</sl-button>
    </div>
</sl-dialog>
