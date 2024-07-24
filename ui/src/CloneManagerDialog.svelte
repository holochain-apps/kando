<script lang="ts">
    import { getContext } from "svelte";
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import SvgIcon from "./SvgIcon.svelte";
    import { KanDoCloneManagerStore, type KanDoStore, NotificationOptions, NotificationType } from "./store";
    import { CellType } from "@holochain/client";
    import { hashEqual } from "./util";
    import { get } from "svelte/store";
    import NewCloneDialog from "./NewCloneDialog.svelte";

    let dialog;
    let newCloneDialog;
    export const open = () => { dialog.show() };

    let instances;
    let loading = true;
    let error;
    let newInstanceName = "";

    const { getStore }: any = getContext('cloneManagerStore');
    
    async function listInstances() {
        loading = true;
        try {
            instances = await cloneManagerStore.list();
        } catch(e) {
            error = e;
        }
        loading = false;
    }
    
    let cloneManagerStore: KanDoCloneManagerStore = getStore();
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
                        {#if CellType.Provisioned in instance.cellInfo}
                            {instance.cellInfo[CellType.Provisioned].name}
                        {:else if CellType.Cloned in instance.cellInfo}
                            {instance.cellInfo[CellType.Cloned].name}
                        {/if}
                    </div>
                    <div>
                        {#if hashEqual(get(cloneManagerStore.activeDnaHash), instance.cellId[0]) }
                            Active
                        {:else if instance.cellInfo[CellType.Cloned]?.enabled ||  instance.cellInfo[CellType.Provisioned]}
                            <sl-button on:click={()=>{
                                cloneManagerStore.activate(instance.cellId);
                            }}>
                                Activate
                            </sl-button>
                        {/if}

                        {#if instance.cellInfo[CellType.Cloned]?.enabled}
                            <sl-button on:click={async () => {
                                await cloneManagerStore.disable(instance.cellId);
                                listInstances();
                            }}>
                                Disable
                            </sl-button>
                        {:else if instance.cellInfo[CellType.Cloned]?.enabled === false}
                            <sl-button on:click={async () => {
                                await cloneManagerStore.enable(instance.cellId);
                                listInstances();
                            }}>
                                Enable
                            </sl-button>
                        {/if}
                    </div>
                </div>
            {/each}          
            
            <div style="margin-top: 10px;">
                <div class="new-clone" on:click={()=>newCloneDialog.open()} title="New Network"><SvgIcon color="white" size=25px icon=faSquarePlus style="margin-left: 15px;"/><span>New Network</span></div>
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