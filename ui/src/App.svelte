<script lang="ts">
  import Controller from "./Controller.svelte";
  import ControllerCreate from "./ControllerCreate.svelte";
  import ControllerBoard from "./ControllerBoard.svelte";
  import ControllerCard from "./ControllerCard.svelte";
  import ControllerBlockActiveBoards from "./ControllerBlockActiveBoards.svelte";
  import {
    AppWebsocket,
    AdminWebsocket,
    type AppClient,
    type AppWebsocketConnectionOptions,
  } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/themes/light.css";
  import "highlight.js/styles/github.css";
  import {
    WeaveClient,
    isWeContext,
    initializeHotReload,
    type WAL,
  } from "@lightningrodlabs/we-applet";
  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
  import KDLogoIcon from "./icons/KDLogoIcon.svelte";
  import { appletServices } from "./we";
  import { USING_FEEDBACK } from "./stores/kando";
  import { KanDoCloneManagerStore } from "./stores/cloneManager";
  import { setContext } from "svelte";

  const appId = import.meta.env.VITE_APP_ID
    ? import.meta.env.VITE_APP_ID
    : "kando";
  const appPort = import.meta.env.VITE_APP_PORT
    ? import.meta.env.VITE_APP_PORT
    : 8888;
  const adminPort = import.meta.env.VITE_ADMIN_PORT;
  const url = `ws://localhost:${appPort}`;

  let client: AppClient;
  let weaveClient: WeaveClient;
  let kandoCloneManagerStore: KanDoCloneManagerStore | undefined = undefined;

  let connected = false;

  let createView;

  enum RenderType {
    App,
    Hrl,
    CreateBoard,
    BlockActiveBoards,
  }

  let renderType = RenderType.App;
  let wal: WAL;

  let initializationError

  initialize();

  async function initialize(): Promise<void> {
    try {
      if ((import.meta as any).env.DEV) {
        try {
          await initializeHotReload();
        } catch (e) {
          console.warn(
            "Could not initialize applet hot-reloading. This is only expected to work in a We context in dev mode."
          );
        }
      }
      let tokenResp;
      if (!isWeContext()) {
        console.log("adminPort is", adminPort);
        if (adminPort) {
          const url = `ws://localhost:${adminPort}`;
          console.log("connecting to admin port at:", url);
          const adminWebsocket = await AdminWebsocket.connect({
            url: new URL(url),
          });
          tokenResp = await adminWebsocket.issueAppAuthenticationToken({
            installed_app_id: appId,
          });
          const x = await adminWebsocket.listApps({});
          console.log("apps", x);
          const cellIds = await adminWebsocket.listCellIds();
          console.log("CELL IDS", cellIds);
          await adminWebsocket.authorizeSigningCredentials(cellIds[0]);
        }
        console.log("appPort and Id is", appPort, appId);
        const params: AppWebsocketConnectionOptions = { url: new URL(url), defaultTimeout: 240000 };
        if (tokenResp) params.token = tokenResp.token;
        client = await AppWebsocket.connect(params);
      } else {
        weaveClient = await WeaveClient.connect(appletServices);

        switch (weaveClient.renderInfo.type) {
          case "applet-view":
            switch (weaveClient.renderInfo.view.type) {
              case "main":
                // here comes your rendering logic for the main view
                break;
              case "block":
                switch (weaveClient.renderInfo.view.block) {
                  case "active_boards":
                    renderType = RenderType.BlockActiveBoards;
                    break;
                  default:
                    throw new Error(
                      "Unknown applet-view block type:" +
                        weaveClient.renderInfo.view.block
                    );
                }
                break;
              case "asset":
                if (!weaveClient.renderInfo.view.recordInfo) {
                  throw new Error(
                    "KanDo does not implement asset views pointing to DNAs instead of Records."
                  );
                } else {
                  switch (weaveClient.renderInfo.view.recordInfo.roleName) {
                    case "kando":
                      switch (
                        weaveClient.renderInfo.view.recordInfo.integrityZomeName
                      ) {
                        case "syn_integrity":
                          switch (
                            weaveClient.renderInfo.view.recordInfo.entryType
                          ) {
                            case "document":
                              renderType = RenderType.Hrl;
                              wal = weaveClient.renderInfo.view.wal;
                              break;
                            default:
                              throw new Error(
                                "Unknown entry type:" +
                                  weaveClient.renderInfo.view.recordInfo.entryType
                              );
                          }
                          break;
                        default:
                          throw new Error(
                            "Unknown integrity zome:" +
                              weaveClient.renderInfo.view.recordInfo
                                .integrityZomeName
                          );
                      }
                      break;
                    default:
                      throw new Error(
                        "Unknown role name:" +
                          weaveClient.renderInfo.view.recordInfo.roleName
                      );
                  }
                }
                break;
              case "creatable":
                switch (weaveClient.renderInfo.view.name) {
                  case "board":
                    renderType = RenderType.CreateBoard;
                    createView = weaveClient.renderInfo.view;
                }
                break;
              default:
                throw new Error("Unsupported applet-view type");
            }
            break;
          case "cross-applet-view":
            switch (this.weaveClient.renderInfo.view.type) {
              case "main":
              // here comes your rendering logic for the cross-applet main view
              //break;
              case "block":
              //
              //break;
              default:
                throw new Error("Unknown cross-applet-view render type.");
            }
            break;
          default:
            throw new Error("Unknown render view type");
        }

        client = weaveClient.renderInfo.appletClient;
      }
    
      kandoCloneManagerStore = new KanDoCloneManagerStore(
        client,
        weaveClient
      );
      await kandoCloneManagerStore.activeStore.load();
      connected = true;
    }
    catch (e) {
      initializationError = e
    }
  }

  setContext("cloneManagerStore", {
    getStore: () => kandoCloneManagerStore,
  });

  $: kandoStore = kandoCloneManagerStore?.activeStore;
  $: profilesStore = $kandoStore?.profilesStore;
  $: prof = profilesStore?.myProfile;
</script>

<svelte:head></svelte:head>
{#if connected}
  <profiles-context store={profilesStore}>
    {#if $prof.status == "pending"}
      <div class="loading"><div class="loader"></div></div>
    {:else if $prof.status == "complete" && $prof.value == undefined}
      <div class="create-profile">
        {#if USING_FEEDBACK}
          <div class="welcome-text-feedback" >
            <h2 style="display:flex;justify-content:center">Welcome to the Moss feedback boards</h2>
            <p style="display:flex;justify-content:center">powered by <span style="margin-left:10px;width:100px;" class="logo-frame"><KDLogoIcon color="#3498db"/></span></p>
            <p style="display:flex;justify-content:center;font-size:110%;width:500px;">Our feedback system is public so the community can learn what others are saying about Moss and the various tools.  Thus that profile info you enter below will be visible to all Moss users.</p>
          </div>
        {:else}
          <div class="welcome-text">
            <div><KDLogoIcon /></div>
          </div>
        {/if}
        <create-profile on:profile-created={() => {}}></create-profile>
      </div>
    {:else if $prof.status == "error"}
      Error when loading profile: {$prof.error}
    {:else if renderType == RenderType.CreateBoard}
      <ControllerCreate
        view={createView}
        store={$kandoStore}
      ></ControllerCreate>
    {:else if renderType == RenderType.App}
      <Controller store={$kandoStore}
      ></Controller>
    {:else if renderType == RenderType.Hrl && !wal.context}
      <ControllerBoard
        board={wal.hrl[1]}
        store={$kandoStore}
      ></ControllerBoard>
    {:else if renderType == RenderType.Hrl && wal.context}
      <ControllerCard
        board={wal.hrl[1]}
        cardId={wal.context}
        store={$kandoStore}
      ></ControllerCard>
    {:else if renderType == RenderType.BlockActiveBoards}
      <ControllerBlockActiveBoards
        store={$kandoStore}
      ></ControllerBlockActiveBoards>
    {/if}
  </profiles-context>
{:else}
  {#if initializationError}
    <div class="init-error">
      <h3>Initialization Error: </h3>
        {initializationError}
    </div>
  {:else}
    <div class="loading"><div class="loader"></div></div>
  {/if}
{/if}

<style>
  .init-error {
    display:flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 100px;
  }
  .welcome-text {
    margin: 40px 10px 40px 10px;
    border-radius: 20px;
    background-color: #3498db;
    padding: 8%;
    width: 100%;
  }

  @media screen and (min-width: 475px) {
    .welcome-text {
      width: 150%;
    }
  }
  .welcome-text-feedback {
    margin-bottom:50px;
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
    box-shadow: 0px 10px 10px rgba(0, 0, 0, 0.15);
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
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
