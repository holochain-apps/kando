import {
    type AppAgentClient,
    type EntryHash,
    type AgentPubKeyB64,
    type AppAgentCallZomeRequest,
    type RoleName,
    encodeHashToBase64,
  } from '@holochain/client';
import { RecordBag } from '@holochain-open-dev/utils';
import { SynStore,  SynClient, type Commit } from '@holochain-syn/core';
import { CommitTypeBoard, type BoardState } from './board';
import { BoardList, CommitTypeBoardList } from './boardList';
import { decode } from '@msgpack/msgpack';
import {toPromise, writable, type Writable} from '@holochain-open-dev/stores'
import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { v1 as uuidv1 } from "uuid";


TimeAgo.addDefaultLocale(en)

const ZOME_NAME = 'syn'

export class KanDoService {
    constructor(public client: AppAgentClient, public roleName, public zomeName = ZOME_NAME) {}

    private callZome(fnName: string, payload: any) {
        const req: AppAgentCallZomeRequest = {
            role_name: this.roleName,
            zome_name: this.zomeName,
            fn_name: fnName,
            payload
          }
        return this.client.callZome(req);
    }
}

export interface UIProps {
    showArchived: {[key: string]: boolean},
    showMenu: boolean,
  }

export class KanDoStore {
    timeAgo = new TimeAgo('en-US')
    service: KanDoService;
    boardList: BoardList;
    createdBoards: Array<EntryHash> = []
    updating = false
    synStore: SynStore;
    client: AppAgentClient;
    uiProps: Writable<UIProps> = writable({
        showArchived: {},
        showMenu: true,
    })

    setUIprops(props:{}) {
        this.uiProps.update((n) => {
            Object.keys(props).forEach(key=>n[key] = props[key])
            return n
        })
    }

    myAgentPubKey(): AgentPubKeyB64 {
        return encodeHashToBase64(this.client.myPubKey);
    }

    constructor(
        protected clientIn: AppAgentClient,
        protected roleName: RoleName,
        protected zomeName: string = ZOME_NAME
    ) {
        this.client = clientIn
        this.service = new KanDoService(
          this.client,
          this.roleName,
          this.zomeName
        );
        //@ts-ignore
        this.synStore = new SynStore(new SynClient(this.client,this.roleName,this.zomeName))
        // this.synStore.knownRoots.subscribe( async (roots) => {
        //     if (this.updating) {
        //         console.log(`${roots.entryActions.keys().length} ROOTS UPDATE CALLED but allready updating`, roots)
        //         return
        //     }
        //     this.updating = true
        //     try {
        //         await this.findOrMakeRoots(roots)
        //     } catch (e) {
        //         console.log("Error while updating board list: ",e)
        //     }
        //     this.updating = false
        // })
    }

    commitType(commit: Commit) : string {
        const meta:any = decode(commit.meta)
        return meta.type
    }

    async findOrMakeRoots(): Promise<any> {

        const roots = await toPromise(this.synStore.allRoots)
        const records: RecordBag<Commit> = new RecordBag(roots.map(er => er.record))
        const entries = records.entryMap.entries()
        console.log(`Found ${records.entryMap.size} root entries`)
        if (records.entryMap.size == 0) { 
            console.log(`Found no root entries, creating`)
            this.boardList = await BoardList.Create(this.synStore);
        } else {
            let boardListRoot
            let boardsRoot
                    
            Array.from(entries).forEach(async ([hash, commit], i) => {
                const commitType = this.commitType(commit)
                const rootCommit = records.entryRecords[i]
                if (commitType === CommitTypeBoardList) {
                    if (!boardListRoot) {
                        console.log("Found a board list root:", encodeHashToBase64(rootCommit.entryHash))
                        boardListRoot = rootCommit
                    } else {
                        console.log("Found a board list root, but have allready joined:", encodeHashToBase64(boardListRoot.entryHash))
                    }
                }
                if (commitType === CommitTypeBoard) {
                    if (!boardsRoot) {
                        console.log("Found a board root:", encodeHashToBase64(rootCommit.entryHash))
                        boardsRoot = rootCommit
                    } else {
                        console.log("Found a board root, but have allread stored: ", encodeHashToBase64(boardsRoot.entryHash))
                    }
                }
            });
            if (boardListRoot && boardsRoot) {
                this.boardList = await BoardList.Join(this.synStore, boardListRoot, boardsRoot)
            } else {
                console.log("Missing root, found: ", boardListRoot, boardsRoot )
            }

        }
    }

    async loadBoards() : Promise<any> {
        console.log("fetching all roots...")
        try {
            await this.findOrMakeRoots()
        } catch (e) {
            console.log("Error Fetching Roots:", e)
        }
    }

    getCardGroupName(cardId: uuidv1, state: BoardState) : string  {
        const [gId, cId] = Object.entries(state.grouping).find(([gId, cId])=>cId==cardId)
        const g = (state.groups.find((g)=>g.id == gId))
        if (g) {
            return g.name
        }
        return "Archived"
    }

}