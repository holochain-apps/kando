<script lang="ts">
    import { getContext } from "svelte";
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import SvgIcon from "./SvgIcon.svelte";
    import { KanDoCloneManagerStore, type KanDoStore, NotificationOptions, NotificationType } from "./store";
    import { CellType } from "@holochain/client";
    import { hashEqual } from "./util";
    import { get } from "svelte/store";
    let dialog;
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

<sl-dialog label="Manage Networks" bind:this={dialog} width={1000} >
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

            <div style="margin-top: 25px;">
                <h3>Create Network</h3>

                <sl-input value={newInstanceName} on:sl-input={(e)=>{
                    newInstanceName = e.target.value
                }}></sl-input>
                <sl-button style="margin-top: 5px;" on:click={async () => {
                    const res = await cloneManagerStore.create(newInstanceName);
                    listInstances();
                }}>Create</sl-button>
            </div>            
        {:else if error}
            Error: {error}
        {/if}
    </div>

</sl-dialog>