import { DocumentStore, SynClient, SynStore, WorkspaceStore } from '@holochain-syn/core';
import type { BoardEphemeralState, BoardState } from './board';
import { asyncDerived, pipe, sliceAndJoin, toPromise } from '@holochain-open-dev/stores';
import { BoardType } from './boardList';
import { LazyHoloHashMap } from '@holochain-open-dev/utils';
import type { AppletHash, AppletServices, AssetInfo, RecordInfo, WAL, WeaveServices } from '@lightningrodlabs/we-applet';
import { getMyDna } from './utils/util';
import type { AppClient, RoleName } from '@holochain/client';

const ROLE_NAME = "kando"
const ZOME_NAME = "syn"

const BOARD_ICON_SRC = `data:image/svg+xml;utf8,<svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="black" ><path d="M2.5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-11zm5 2h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm-5 1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3zm9-1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>`
const CARD_ICON_SRC = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 0v64h64V96H64zm384 0H192v64H448V96zM64 224v64h64V224H64zm384 0H192v64H448V224zM64 352v64h64V352H64zm384 0H192v64H448V352z"/></svg>`

export const appletServices: AppletServices = {
    // Types of attachment that this Applet offers for other Applets to be created
    creatables: {
      'board': {
        label: "Board",
        icon_src: BOARD_ICON_SRC,
      }
    },
    // Types of UI widgets/blocks that this Applet supports
    blockTypes: {
      'active_boards': {
        label: 'Active Boards',
        icon_src: 
        `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 0v64h64V96H64zm384 0H192v64H448V96zM64 224v64h64V224H64zm384 0H192v64H448V224zM64 352v64h64V352H64zm384 0H192v64H448V352z"/></svg>`,
        view: "applet-view",
      },      
    },
    bindAsset: async (appletClient: AppClient,
      srcWal: WAL, dstWal: WAL): Promise<void> => {
      console.log("Bind requested.  Src:", srcWal, "  Dst:", dstWal)
    },
    getAssetInfo: async (
      appletClient: AppClient,
      wal: WAL,
      recordInfo: RecordInfo,
    ): Promise<AssetInfo | undefined> => {
      if (recordInfo) {
        const roleName: RoleName = recordInfo.roleName
        // const integrityZomeName: ZomeName = recordInfo.integrityZomeName
        const entryType: string = recordInfo.entryType

        if (entryType == "document") {
          const synClient = new SynClient(appletClient, roleName, ZOME_NAME);
          const synStore = new SynStore(synClient);
          const documentHash = wal.hrl[1]
          const docStore = new DocumentStore<BoardState, BoardEphemeralState> (synStore, documentHash)
          const workspaces = await toPromise(docStore.allWorkspaces)
          const workspace = new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
          const latestState = await toPromise(workspace.latestState)

          if (wal.context) {
            const card = latestState.cards.find(c=>c.id === wal.context)
            if (card) {
              return {
                icon_src: CARD_ICON_SRC,
                name: `${latestState.name}: ${card.props.title}`,
              };    
            }
          }
          return {
            icon_src: BOARD_ICON_SRC,
            name: latestState.name,
          };
        } else {
          throw new Error("Kando doesn't know about entry type:"+ entryType)
        }
      } else {
        throw new Error("Null WAL not supported, must supply a recordInfo")
      }
    },
    search: async (
      appletClient: AppClient,
      appletHash: AppletHash,
      weaveServices: WeaveServices,
      searchFilter: string
    ): Promise<Array<WAL>> => {
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
                w => w.latestState
                )
            return latestState
        })
    
        const allBoardsAsync = pipe(boardHashes,
            docHashes => sliceAndJoin(boardData, docHashes)
        )

        const allBoards = Array.from((await toPromise(allBoardsAsync)).entries())
        const dnaHash = await getMyDna(ROLE_NAME, appletClient)
        const searchText = searchFilter.toLowerCase()

        let hrls: Array<WAL> = allBoards
            .filter((r) => !!r)
            .filter((r) => {
                const state = r[1]
                return state.name.toLowerCase().includes(searchText)
            })
            .map((r) => ({ hrl: [dnaHash, r![0]], context: undefined }));
        for (const r of allBoards.filter((r) => !!r)) {
          const state: BoardState = r[1]
          for (const card of state.cards) {
            if (card.props.title.toLowerCase().includes(searchText) || 
                card.props.description.toLowerCase().includes(searchText) ||
                Object.values(card.comments).find(c=>c.text.includes(searchText))
                ) {
                hrls.push({ hrl: [dnaHash, r![0]], context: card.id })
              }
          }
        }
        return hrls
    },
};
  