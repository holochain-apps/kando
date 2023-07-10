<script lang="ts">
  import Controller from './Controller.svelte'
  import { BoardType } from './board'
  import { AppAgentWebsocket, AdminWebsocket } from '@holochain/client';

  const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'kando'
  const roleName = 'kando'
  const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
  const adminPort = import.meta.env.VITE_ADMIN_PORT
  const url = `ws://localhost:${appPort}`;

  let client: AppAgentWebsocket  

  let connected = false
  initialize()

  async function initialize() : Promise<void> {
    console.log("adminPort is", adminPort)
    if (adminPort) {
      const adminWebsocket = await AdminWebsocket.connect(`ws://localhost:${adminPort}`)
      const x = await adminWebsocket.listApps({})
      console.log("apps", x)
      const cellIds = await adminWebsocket.listCellIds()
      console.log("CELL IDS",cellIds)
      await adminWebsocket.authorizeSigningCredentials(cellIds[0])
    }
    console.log("appPort and Id is", appPort, appId)
    client = await AppAgentWebsocket.connect(url, appId)

    connected = true
  }
</script>

<svelte:head>
</svelte:head>
{#if connected}
  <Controller client={client} boardType={BoardType.KanDo} roleName={roleName}></Controller>
{:else}
  Connecting...
{/if}

<style>
  :global(body) {
    font-family: Roboto,'Open Sans','Helvetica Neue',sans-serif;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>