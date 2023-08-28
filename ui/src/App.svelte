<script lang="ts">
  import Controller from './Controller.svelte'
  import { AppAgentWebsocket, AdminWebsocket, type AppAgentClient, decodeHashFromBase64 } from '@holochain/client';
  import '@shoelace-style/shoelace/dist/themes/light.css';
  import WebSdk from '@holo-host/web-sdk'
  import { onMount } from 'svelte';

  const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'kando'
  const roleName = 'kando'
  const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
  const adminPort = import.meta.env.VITE_ADMIN_PORT
  const url = `ws://localhost:${appPort}`;
  export const IS_HOLO = ['true', '1', 't'].includes(import.meta.env.VITE_APP_IS_HOLO?.toLowerCase())

  let client: AppAgentClient  

  let connecting = true
  let holoError = undefined

//  onMount(async () => {
  initialize()
//  })

  async function initialize() : Promise<void> {
    if (IS_HOLO) {        
      client = await WebSdk.connect({
        chaperoneUrl: import.meta.env.VITE_APP_CHAPERONE_URL,
        authFormCustomization: {
          appName: 'KanDo',
        }
      });

      (client as WebSdk).on('agent-state', agentState => {
        client.myPubKey = decodeHashFromBase64(agentState.id) // #work-around bug that myPubKey val isn't getting set TODO: remove when fixed.
        connecting = !agentState.isAvailable || agentState.isAnonymous
        holoError = agentState.unrecoverableError
      });

      // (client as WebSdk).on('agent-state', agent_state => {
      //   connecting = !agent_state.isAvailable || agent_state.isAnonymous
      // });
      
      (client as WebSdk).signUp({ cancellable: false });

    } else {

      console.log("adminPort is", adminPort)
      if (adminPort) {
        const adminWebsocket = await AdminWebsocket.connect(new URL(`ws://localhost:${adminPort}`))
        const x = await adminWebsocket.listApps({})
        console.log("apps", x)
        const cellIds = await adminWebsocket.listCellIds()
        console.log("CELL IDS",cellIds)
        await adminWebsocket.authorizeSigningCredentials(cellIds[0])
      }
      console.log("appPort and Id is", appPort, appId)
      client = await AppAgentWebsocket.connect(new URL(url), appId)
      connecting = false
    }
  }
</script>

<svelte:head>
</svelte:head>
{#if holoError}
  Holo Error:
  {#if holoError.type == "paused"}
    This happ has been deactivated
  {:else if holoError.type == "not_hosted"}
    Happ not found
  {:else if holoError.type == "error_getting_app_info"}
    Internal Error-- unable to get app info
  {:else if holoError.type == "error_enabling"}
    Internal Error-- error enabling the happ
  {/if}
{:else}
  {#if connecting}
    {#if IS_HOLO}
      Connecting to the Holo network
    {:else}
      Connecting to holochain conductor...
    {/if}
  {:else}
    <Controller client={client} roleName={roleName}></Controller>
  {/if}
{/if}
<style>
  :global(body) {
    font-family: Roboto,'Open Sans','Helvetica Neue',sans-serif;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>