<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import { type CellInfoNormalized } from "./stores/kando";
    import { encodeDnaJoiningCode } from "./util";
    import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
    import SvgIcon from "./SvgIcon.svelte";

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
    <div>
        <p>Share this code with a friend to grant them access to the Kando Network <b>{cell?.name}</b></p>
        <sl-textarea rows="2" style="margin-top: 10px;" value={joiningCode}></sl-textarea>
        <div style="display: flex; justify-content: flex-end; align-items: center">
            <sl-button style="margin-top: 10px;" on:keydown={copyJoiningCode} on:click={copyJoiningCode}>
                <div style="display: flex; justify-content: flex-start; align-items: center;">
                    <SvgIcon icon="faClone" size="16px"/>
                    <div style="margin-left: 10px;">Copy Joining Code</div>
                </div>
            </sl-button>
        </div>
    </div>
</sl-dialog>
