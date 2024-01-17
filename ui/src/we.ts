import { DocumentStore, SynClient, SynStore, WorkspaceStore } from '@holochain-syn/core';
import { CellType, type AppAgentClient, type RoleName, type ZomeName, type DnaHash } from '@holochain/client';
import { Board, type BoardEphemeralState, type BoardState } from './board';
import { asyncDerived, pipe, sliceAndJoin, toPromise } from '@holochain-open-dev/stores';
import { BoardType } from './boardList';
import { LazyHoloHashMap } from '@holochain-open-dev/utils';
import type { AppletHash, AppletServices, AttachableInfo, HrlWithContext, WeServices } from '@lightningrodlabs/we-applet';
import { wrapPathInSvg } from "@holochain-open-dev/elements"

const ROLE_NAME = "kando"
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
        async create(attachToHrlWithContext: HrlWithContext) {
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
    blockTypes: {
      'active_boards': {
        label: 'Active Boards',
        icon_src: 
        `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 0v64h64V96H64zm384 0H192v64H448V96zM64 224v64h64V224H64zm384 0H192v64H448V224zM64 352v64h64V352H64zm384 0H192v64H448V352z"/></svg>`,
        view: "applet-view",
      },      
    },
    getAttachableInfo: async (
      appletClient: AppAgentClient,
      roleName: RoleName,
      integrityZomeName: ZomeName,
      entryType: string,
      hrlWithContext: HrlWithContext
    ): Promise<AttachableInfo | undefined> => {
        const synClient = new SynClient(appletClient, roleName, ZOME_NAME);
        const synStore = new SynStore(synClient);
        const documentHash = hrlWithContext.hrl[1]
        const docStore = new DocumentStore<BoardState, BoardEphemeralState> (synStore, documentHash)
        const workspaces = await toPromise(docStore.allWorkspaces)
        const workspace = new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
        const latestSnapshot = await toPromise(workspace.latestSnapshot)

        return {
          icon_src: `data:image/svg+xml;utf8,<svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="black" ><path d="M2.5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-11zm5 2h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm-5 1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3zm9-1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>`,
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
  