<script lang="ts">
    import { getContext } from "svelte";
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import SvgIcon from "./SvgIcon.svelte";
    import { type CellInfoNormalized, KanDoCloneManagerStore } from "./store";
    import { CellType, type CellId } from "@holochain/client";
    import { hashEqual } from "./util";
    import { get } from "svelte/store";
    import NewCloneDialog from "./NewCloneDialog.svelte";
    import ShareCloneDialog from "./ShareCloneDialog.svelte";

    let dialog;
    let newCloneDialog;
    let shareCloneDialog;
    let shareInstance: CellInfoNormalized | undefined;
    export const open = () => { dialog.show() };

    let instances: CellInfoNormalized[];
    let loading = true;
    let error;
    
    const { getStore }: any = getContext('cloneManagerStore');
    let cloneManagerStore: KanDoCloneManagerStore = getStore();

    async function listInstances() {
        loading = true;
        try {
            instances = await cloneManagerStore.list();
        } catch(e) {
            error = e;
        }
        loading = false;
    }

    const activate = (cellId: CellId) => cloneManagerStore.activate(cellId);
    const disable = (cellId: CellId) => {
        cloneManagerStore.disable(cellId);
        listInstances();
    };
    const enable = (cellId: CellId) => {
        cloneManagerStore.enable(cellId);
        listInstances();
    };
    const share = (instance: CellInfoNormalized) => {
        shareInstance = instance;
        shareCloneDialog.open();
    };

    listInstances();
</script>

<sl-dialog label="Networks" bind:this={dialog} width={1000} >
    <div style="display:flex;flex-direction:column">
        {#if loading}
            <div class="spinning" style="display:inline-block"> <SvgIcon icon=faSpinner  color="black"></SvgIcon></div>
        {:else if instances && instances.length > 0}
            {#each instances as instance}
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        {instance.name}
                    </div>
                    <div>
                        {#if hashEqual(get(cloneManagerStore.activeDnaHash), instance.cellId[0]) }
                            Active
                        {:else if instance.cellInfo[CellType.Cloned]?.enabled ||  instance.cellInfo[CellType.Provisioned]}
                            <sl-button on:click={activate(instance.cellId)} on:keydown={activate(instance.cellId)}>
                                Activate
                            </sl-button>
                        {/if}

                        <sl-button on:click={share(instance)} on:keydown={share(instance)}>Share</sl-button>

                        {#if instance.cellInfo[CellType.Cloned]?.enabled}
                            <sl-button on:click={disable(instance.cellId)} on:keydown={disable(instance.cellId)}>
                                Disable
                            </sl-button>
                        {:else if instance.cellInfo[CellType.Cloned]?.enabled === false}
                            <sl-button on:click={enable(instance.cellId)} on:keydown={enable(instance.cellId)}>
                                Enable
                            </sl-button>
                        {/if}
                    </div>
                </div>
            {/each}          
            
            <div style="margin-top: 10px;">
                <div class="new-clone" on:click={()=>newCloneDialog.open()} on:keydown={()=>newCloneDialog.open()} title="New Network"><SvgIcon color="white" size=25px icon=faSquarePlus style="margin-left: 15px;"/><span>New Network</span></div>
            </div>
        {:else if error}
            Error: {error}
        {/if}
    </div>

</sl-dialog>

<NewCloneDialog bind:this={newCloneDialog} handleSave={async (name) => {
    const res = await cloneManagerStore.create(name);
    listInstances();
}}></NewCloneDialog>
<ShareCloneDialog bind:this={shareCloneDialog} cell={shareInstance} on:close={() => {shareInstance = undefined;}}></ShareCloneDialog>

<style>
.new-clone {
    box-sizing: border-box;
    position: relative;
    width: 290px;
    height: 50px;
    background: rgba(24, 55, 122, 1.0);
    border: 1px solid #4A559D;
    color: #fff;
    display: flex;
    align-items: center;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    transition: all .25s ease;
    top: 3px;
    padding: 15px 0;
    box-shadow: 0px 4px 8px rgba(35, 32, 74, 0);
}

.new-clone:hover {
    cursor: pointer;
    padding: 15px 5px;
    width: 300px;
    border: 1px solid #252d5d;
    background: rgb(10, 25, 57);
    margin: 0 -5px 0 -5px;
    box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.8);
}

.new-clone span {
    color: #fff;
    display: block;
    padding: 0 15px;
}
</style>