<script lang="ts">
  import Controller from './Controller.svelte'
  import { AppAgentWebsocket, AdminWebsocket } from '@holochain/client';
  import '@shoelace-style/shoelace/dist/themes/light.css';
  import { WeClient, isWeContext, initializeHotReload } from '@lightningrodlabs/we-applet';
  import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
  import KDLogoIcon from "./icons/KDLogoIcon.svelte";
  import { appletServices } from './we';

  const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'kando'
  const roleName = 'kando'
  const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
  const adminPort = import.meta.env.VITE_ADMIN_PORT
  const url = `ws://localhost:${appPort}`;

  let client: AppAgentWebsocket
  let weClient: WeClient
  let profilesStore : ProfilesStore|undefined = undefined

  let connected = false
  initialize()

  async function initialize() : Promise<void> {
    let profilesClient
    if ((import.meta as any).env.DEV) {
      try {
        await initializeHotReload();
      } catch (e) {
        console.warn("Could not initialize applet hot-reloading. This is only expected to work in a We context in dev mode.")
      }
    }
    if (!isWeContext()) {
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
        profilesClient = new ProfilesClient(client, appId);
    }
    else {
      weClient = await WeClient.connect(appletServices);

      if (
        !(weClient.renderInfo.type === "applet-view")
        && !(weClient.renderInfo.view.type === "main")
      ) throw new Error("This Applet only implements the applet main view.");

      //@ts-ignore
      client = weClient.renderInfo.appletClient;
      //@ts-ignore
      profilesClient = weClient.renderInfo.profilesClient;
    }
    profilesStore = new ProfilesStore(profilesClient);
    connected = true
  }
  $: prof = profilesStore ? profilesStore.myProfile : undefined

</script>

<svelte:head>
</svelte:head>
{#if connected}

<profiles-context store={profilesStore}>
  {#if $prof.status=="pending"}
    <div class="loading"><div class="loader"></div></div>
  {:else if $prof.status=="complete" && $prof.value == undefined}
    <div class="create-profile">
      <div class="welcome-text"><KDLogoIcon /></div>
      <create-profile
        on:profile-created={()=>{}}
      ></create-profile>
    </div>
  {:else if $prof.status=="error"}
   Error when loading profile: {$prof.error}
  {:else}
    <Controller  client={client} weClient={weClient} profilesStore={profilesStore} roleName={roleName}></Controller>
  {/if}

</profiles-context>
{:else}
<div class="loading"><div class="loader"></div></div>
{/if}

<style>
.welcome-text {
  margin: 40px;
  border-radius: 20px;
  background-color: #3498db ;
}
.create-profile {
  padding-top: 100px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
create-profile {
  box-shadow: 0px 10px 10px rgba(0, 0, 0, .15);
}
:global(body) {
  min-height: 0;
  display: flex;
  flex-direction: column;
}
:global(.loading) {
  text-align: center;
  padding-top: 100px;
  display: flex;
  margin-left: auto;
  margin-right: auto;
  align-items: center;
}
:global(.loader) {
  border: 8px solid #f3f3f3;
  border-radius: 50%;
  border-top: 8px solid #3498db;
  width: 50px;
  height: 50px;
  -webkit-animation: spin 2s linear infinite; /* Safari */
  animation: spin 2s linear infinite;
  display: inline-block;
}
@-webkit-keyframes spin {
  0% { -webkit-transform: rotate(0deg); }
  100% { -webkit-transform: rotate(360deg); }
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>