
import type {
  AppAgentClient,
  CellType,
  DnaHash,
  EntryHash,
} from "@holochain/client";
  import {
    wrapPathInSvg,
    wrapPathInSvgWithoutPrefix,
  } from "@holochain-open-dev/elements";
  import { decode } from "@msgpack/msgpack";
  
  import type {
  Hrl,
  AppletViews,
  CrossAppletViews,
  WeApplet,
  WeServices,
} from "@lightningrodlabs/we-applet";
  
  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
  import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";
//   import "@lightningrodlabs/attachments/dist/elements/attachments-context.js";
//   import "@lightningrodlabs/attachments/dist/elements/attachments-bar.js";
  
  import type { ProfilesClient } from "@holochain-open-dev/profiles";
  
  import './app.css'
  import Controller from './Controller.svelte';

  async function appletViews(
    client: AppAgentClient,
    _appletId: EntryHash,
    profilesClient: ProfilesClient,
    weServices: WeServices
  ): Promise<AppletViews> {
    return {
      main: (element) =>{
        const controller = new Controller({
          target: element,
          props:{
            client, roleName:"kando"
          }
        })
      },
      blocks: {
       
      },
      entries: {
        
      },
    };
  }
  
  async function crossAppletViews(
    applets: ReadonlyMap<
      EntryHash,
      { profilesClient: ProfilesClient; appletClient: AppAgentClient }
    >, // Segmented by groupId
    weServices: WeServices
  ): Promise<CrossAppletViews> {
    return {
      main: (element) =>
        {},
      blocks: {},
    };
  }
  
  const applet: WeApplet = {
    appletViews,
    crossAppletViews,
    attachmentTypes: async (appletClient: AppAgentClient) => ({
    }),
    search: async (
      appletClient: AppAgentClient,
      _appletId: EntryHash,
      _weServices: WeServices,
      filter: string
    ) => { return []},
  };
  
  export default applet;
  