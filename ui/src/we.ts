import { DocumentStore, SynClient, SynStore, WorkspaceStore } from '@holochain-syn/core';
import { CellType, type AppAgentClient, type RoleName, type ZomeName, type DnaHash } from '@holochain/client';
import { Board, type BoardEphemeralState, type BoardState } from './board';
import { asyncDerived, pipe, sliceAndJoin, toPromise } from '@holochain-open-dev/stores';
import { BoardType } from './boardList';
import { LazyHoloHashMap } from '@holochain-open-dev/utils';
import type { AppletHash, AppletServices, EntryInfo, Hrl, HrlWithContext, WeServices } from '@lightningrodlabs/we-applet';

const ROLE_NAME = "talking-stickies"
const ZOME_NAME = "syn"

const getMyDna = async (client: AppAgentClient) : Promise<DnaHash>  => {
    const appInfo = await client.appInfo();
    const dnaHash = (appInfo.cell_info[ROLE_NAME][0] as any)[
      CellType.Provisioned
    ].cell_id[0];
    return dnaHash
} 

export const appletServices: AppletServices = {
    // Types of attachment that this Applet offers for other Applets to attach
    attachmentTypes: async (
      appletClient: AppAgentClient,
      appletHash: AppletHash,
      weServices: WeServices
    ) => ({
      board: {
        label: "Board",
        icon_src: "https://static-00.iconduck.com/assets.00/kanban-icon-480x512-y56i8vrh.png",
        async create(attachToHrl: Hrl) {
          const synStore = new SynStore(new SynClient(appletClient, ROLE_NAME));
          const board = await Board.Create(synStore)
          const dnaHash = await getMyDna(appletClient)
          return {
            hrl: [dnaHash, board.hash],
            context: {},
          };
        },
      },
    }),
    // Types of UI widgets/blocks that this Applet supports
    blockTypes: {},
    getEntryInfo: async (
      appletClient: AppAgentClient,
      roleName: RoleName,
      integrityZomeName: ZomeName,
      entryType: string,
      hrl: Hrl
    ): Promise<EntryInfo | undefined> => {

        const synClient = new SynClient(appletClient, roleName, ZOME_NAME);
        const synStore = new SynStore(synClient);
        const documentHash = hrl[1]
        const docStore = new DocumentStore<BoardState, BoardEphemeralState> (synStore, documentHash)
        const workspaces = await toPromise(docStore.allWorkspaces)
        const workspace = new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
        const latestSnapshot = await toPromise(workspace.latestSnapshot)

        return {
            icon_src: "https://static-00.iconduck.com/assets.00/kanban-icon-480x512-y56i8vrh.png",
            name: latestSnapshot.name,
        };
    },
    search: async (
      appletClient: AppAgentClient,
      appletHash: AppletHash,
      weServices: WeServices,
      searchFilter: string
    ): Promise<Array<HrlWithContext>> => {
        const synClient = new SynClient(appletClient, ROLE_NAME, ZOME_NAME);
        const synStore = new SynStore(synClient);
        const boardHashes = asyncDerived(synStore.documentsByTag.get(BoardType.active),x=>Array.from(x.keys()))
            
        const boardData = new LazyHoloHashMap( documentHash => {
            const docStore = synStore.documents.get(documentHash)
    
            const workspace = pipe(docStore.allWorkspaces,
                workspaces => {
                    return new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
                }
            ) 
            const latestState = pipe(workspace, 
                w => w.latestSnapshot
                )
            return latestState
        })
    
        const allBoardsAsync = pipe(boardHashes,
            docHashes => sliceAndJoin(boardData, docHashes)
        )

        const allBoards = Array.from((await toPromise(allBoardsAsync)).entries())
        const dnaHash = await getMyDna(appletClient)

        return allBoards
            .filter((r) => !!r)
            .filter((r) => {
                const state = r[1]
                return state.name.toLowerCase().includes(searchFilter.toLowerCase())
            })
            .map((r) => ({ hrl: [dnaHash, r![0]], context: {} }));
    },
};
  

// // Then handle all the different types of views that you offer
// switch (weClient.renderInfo.type) {
//   case "applet-view":
//     switch (weClient.renderInfo.view.type) {
//       case "main":
//         // here comes your rendering logic for the main view
//       case "block":
//         switch(weClient.renderInfo.view.block) {
//           case "most_recent_posts":
//             // your rendering logic to display this block type
//           case "bookmarked_posts":
//             // Your rendering logic to display this block type
//           default:
//              throw new Error("Unknown applet-view block type");
//         }
//       case "entry":
//         switch (weClient.renderInfo.view.roleName) {
//           case "forum":
//             switch (weClient.renderInfo.view.integrityZomeName) {
//               case "posts_integrity":
//                 switch (weClient.renderInfo.view.entryType) {
//                   case "post":
//                         // here comes your rendering logic for that specific entry type
//                   default:
//                     throw new Error("Unknown entry type");
//                 }
//               default:
//                 throw new Error("Unknown integrity zome");
//             }
//           default:
//             throw new Error("Unknown role name");
//         }

//       default:
//         throw new Error("Unknown applet-view type");
//     }

//   case "cross-applet-view":
//     switch (this.weClient.renderInfo.view.type) {
//       case "main":
//         // here comes your rendering logic for the cross-applet main view
//       case "block":
//         //
//       default:
//         throw new Error("Unknown cross-applet-view render type.")

//     `;
//     }

//   default:
//     throw new Error("Unknown render view type");

// }
