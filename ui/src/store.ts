import {
    type AppClient,
    type EntryHash,
    type AgentPubKeyB64,
    type AppCallZomeRequest,
    type RoleName,
    encodeHashToBase64,
    type EntryHashB64,
    type AgentPubKey,
    decodeHashFromBase64,
    type Timestamp,
    type DnaHash,
    type CellInfo,
    CellType,
    type CellId,
} from '@holochain/client';
import { SynStore,  SynClient} from '@holochain-syn/core';
import { BoardList } from './boardList';
import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { v1 as uuidv1 } from "uuid";
import { derived, get, writable, type Unsubscriber, type Writable } from "svelte/store";
import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
import { UngroupedName, type BoardState } from './board';
import type { WeaveClient } from '@lightningrodlabs/we-applet';
import { HoloHashMap } from '@holochain-open-dev/utils';
import { v7 as uuidv7 } from "uuid";
import { asyncDerived, type Loadable } from '@square/svelte-store';
import { hashEqual } from './util';

// @ts-ignore
export const USING_FEEDBACK :boolean | undefined = window.__USING_FEEDBACK || (import.meta as any).env.VITE_USING_FEEDBACK

TimeAgo.addDefaultLocale(en)

const ZOME_NAME = 'syn'
export const ROLE_NAME = 'kando'

export enum SeenType {
    Tip="t",
    Comment="c",
}

export type NotificationOption = {
    id: string,
    name: string,
}
export const NotificationOptions = [
    {id: 'addCard', name:'Adding new cards'},
    {id: 'assignedMe', name:'Card assigned to me'},
    {id: 'assignedAny', name:'Card assigned to anyone'},
    {id: 'moveMy', name:'Moving my cards'},
    {id: 'moveAny', name:'Moving any card'},
    {id: 'commentMy', name:'Comments on my cards'},
    {id: 'commentAny', name:'Comments on any card'},
    {id: 'updateMy', name:'Updates to my cards'},
    {id: 'updateAny', name:'Updates to any card'},

    {id: 'addBoard', name:'Adding boards'},
    {id: 'updateBoard', name:'Changing board settings'},
]
export enum NotificationType {
    None=  "",
    Low= "low",
    Medium= "medium",
    High="high"
} 


export interface UIProps {
    showArchived: {[key: string]: boolean},
    showMenu: boolean,
    showFeedback: boolean,
    tips: HoloHashMap<EntryHash,EntryHash>,
    latestComment: {[key: string]: Timestamp}
    notifications: {[key: string]: NotificationType}
    showArchivedBoards: boolean
  }

export class KanDoStore {
    myAgentPubKeyB64: AgentPubKeyB64
    timeAgo = new TimeAgo('en-US')
    boardList: BoardList;
    updating = false
    synStore: SynStore;
    uiProps: Writable<UIProps>
    unsub: Unsubscriber
    weaveClient: WeaveClient
    client: AppClient

    constructor(
        public managerStore: KanDoCloneManagerStore,
        public profilesStore: ProfilesStore,
        public dnaHash: DnaHash,
        public roleName: RoleName,
    ) {
        this.weaveClient = this.managerStore.weaveClient;
        this.client = this.managerStore.client;

        this.myAgentPubKeyB64 = encodeHashToBase64(this.client.myPubKey);
        this.synStore = new SynStore(new SynClient(this.client,this.roleName,ZOME_NAME))
        this.uiProps = writable({
            showArchived: {},
            showArchivedBoards: false,
            showMenu: true,
            showFeedback: USING_FEEDBACK,
            tips: new HoloHashMap,
            latestComment: {},
            notifications: {
                assignedToMe:NotificationType.High,
                moveMy:NotificationType.High,
                commentMy:NotificationType.High,
                updateMy:NotificationType.Medium,
                addBoard:NotificationType.Low,
                addCard:NotificationType.Low,
            }
        })
        for (let i = 0; i < localStorage.length; i+=1){
            const key = localStorage.key(i)
            const [type, boardHashB64, cardId] = key.split(":")
            switch (type) {
                case SeenType.Tip:
                    const tipB64 = localStorage.getItem(key)
                    this.setSeenTip(decodeHashFromBase64(boardHashB64), decodeHashFromBase64(tipB64))
                    break;
                case SeenType.Comment:
                    const timestampStr = localStorage.getItem(key)
                    this.setLatestComment(decodeHashFromBase64(boardHashB64),cardId, parseInt(timestampStr))
                    break;
                case "notifications":
                    const notifications:NotificationOptions = JSON.parse(localStorage.getItem(key))
                    this.setUIprops({notifications})
                    break;
            }
        }
        this.boardList = new BoardList(this.profilesStore, this.synStore, this.weaveClient, derived(this.uiProps, props=>props.notifications))
        this.boardList.activeBoard.subscribe((board)=>{
            if (this.unsub) {
                this.unsub()
                this.unsub = undefined
            }
            if (board != undefined) {
                this.unsub = board.workspace.tip.subscribe((tip)=>{
                    if (tip.status == "complete" && tip.value) {
                        this.updateSeenTip(board.hash, tip.value.entryHash)
                    }
                })
            }
        })

    }

    setNotifications(name:string, value: NotificationType) {
        const notifications = get(this.uiProps).notifications

        notifications[name] = value

        this.setUIprops({notifications})
        localStorage.setItem("notifications", JSON.stringify(notifications))
    }

    updateSeenTip(boardHash: EntryHash, tip:EntryHash) {
        if (boardHash && tip) {
            localStorage.setItem(`${SeenType.Tip}:${encodeHashToBase64(boardHash)}`, encodeHashToBase64(tip))
            this.setSeenTip(boardHash, tip)
        }
    }

    setSeenTip(boardHash:EntryHash, tip: EntryHash) {
        this.uiProps.update((n) => {
            n.tips.set(boardHash,tip)
            return n
        })
    }

    updateLatestComment(boardHash: EntryHash, cardId:uuidv1, timestamp:Timestamp) {
        localStorage.setItem(`${SeenType.Comment}:${encodeHashToBase64(boardHash)}:${cardId}`, `${timestamp}`)
        this.setLatestComment(boardHash,cardId,timestamp)
    }

    setLatestComment(boardHash: EntryHash, cardId:uuidv1, timestamp:Timestamp) {
        this.uiProps.update((n) => {
            n.latestComment[`${encodeHashToBase64(boardHash)}:${cardId}`] = timestamp
            return n
        })
    }

    getLatestComment(boardHash: EntryHash, cardId:uuidv1) : Timestamp {
        return get(this.uiProps).latestComment[`${encodeHashToBase64(boardHash)}:${cardId}`]
    }

    setUIprops(props:{}) {
        this.uiProps.update((n) => {
            Object.keys(props).forEach(key=>n[key] = props[key])
            return n
        })
    }

    async setActiveBoard(hash: EntryHash | undefined) {
        const board = await this.boardList.setActiveBoard(hash)
        // let bgUrl = ""
        // if (board) {
        //     const state = board.state()
        //     if (state) {
        //         bgUrl = state.props.bgUrl
        //     }
        // }
        this.setUIprops({showMenu:false/*, bgUrl*/})
    }

    async closeActiveBoard(leave: boolean) {
        await this.boardList.closeActiveBoard(leave)
        this.setUIprops({showMenu:true, bgUrl:""})
    }


    async archiveBoard(documentHash: EntryHash) {
        const wasActive = this.boardList.archiveBoard(documentHash)
        if (wasActive ) {
            this.setUIprops({showMenu:true, bgUrl:""})
        }
    }

    get myAgentPubKey(): AgentPubKey {
        return this.client.myPubKey;
    }

    getCardGroupId(cardId: uuidv1, state: BoardState) : uuidv1  {
        const keyValPairs = Object.entries(state.grouping)
        for (const [gId, cardIds] of keyValPairs) {
            if (cardIds.includes(cardId)) {
                return gId
            }
        }
        return undefined
    }

    getCardGroupName(cardId: uuidv1, state: BoardState) : string  {
        const gId = this.getCardGroupId(cardId, state)
        if (gId === "_") {
            return UngroupedName
        }
        const g = (state.groups.find((g)=>g.id == gId))
        if (g) {
            return g.name
        }
        return "Unknown"
    }

}

export interface CellInfoNormalized {
    cellId: CellId;
    cellInfo: CellInfo;
    roleName: string;
    name: string;
    networkSeed: string;
    displayName: string;
}

export class KanDoCloneManagerStore {
    activeDnaHash: Writable<DnaHash>;
    activeCellInfoNormalized: Loadable<CellInfoNormalized>;
    activeStore: Loadable<KanDoStore>;

    constructor(
        public client: AppClient,
        public weaveClient?: WeaveClient,
    ) {
        this.activeDnaHash = writable<DnaHash>();
        this.activeDnaHash.subscribe(this._saveActiveDnaHash);
        this.activeCellInfoNormalized = asyncDerived(this.activeDnaHash, async ($activeDnaHash) => {
            if(!this.activeDnaHash) return;

            const appInfo = await this.client.appInfo();
            
            const cellInfo = appInfo.cell_info[ROLE_NAME].find((cellInfo: CellInfo) => {
                if(CellType.Provisioned in cellInfo) {
                    return hashEqual(cellInfo[CellType.Provisioned].cell_id[0], $activeDnaHash);
                } else if(CellType.Cloned in cellInfo) {
                    return hashEqual(cellInfo[CellType.Cloned].cell_id[0], $activeDnaHash);
                }
            });

            if(cellInfo === undefined || CellType.Provisioned in cellInfo) {
                return {
                    cellId: cellInfo[CellType.Provisioned].cell_id,
                    cellInfo: cellInfo,
                    roleName: ROLE_NAME,
                    name: cellInfo[CellType.Provisioned].name,
                    networkSeed: cellInfo[CellType.Provisioned].dna_modifiers.network_seed,
                    displayName: cellInfo[CellType.Provisioned].dna_modifiers.network_seed === "" ? "Public" : cellInfo[CellType.Provisioned].name,
                };
            } else if(CellType.Cloned in cellInfo) {
                return {
                    cellId: cellInfo[CellType.Cloned].cell_id,
                    cellInfo: cellInfo,
                    roleName: cellInfo[CellType.Cloned].clone_id,
                    name: cellInfo[CellType.Cloned].name,
                    networkSeed: cellInfo[CellType.Cloned].dna_modifiers.network_seed,
                    displayName: cellInfo[CellType.Cloned].dna_modifiers.network_seed === "" ? "Public" : cellInfo[CellType.Cloned].name,
                };
            }
        });
        this.activeStore = asyncDerived([this.activeDnaHash, this.activeCellInfoNormalized], async ([$activeDnaHash, $activeCellInfoNormalized]) => {
            await this.activeCellInfoNormalized.load();

            const profilesClient = this.weaveClient !== undefined ? weaveClient.renderInfo.profilesClient : new ProfilesClient(this.client, $activeCellInfoNormalized.roleName);
            return new KanDoStore(this, new ProfilesStore(profilesClient), $activeDnaHash, $activeCellInfoNormalized.roleName);
        });
        this._loadActiveDnaHash();
    }
    
    async list(): Promise<CellInfoNormalized[]> {
        const appInfo = await this.client.appInfo();
        const cells = appInfo.cell_info[ROLE_NAME];
        const cellsNormalized =  cells.map((cell) => {
            if(CellType.Provisioned in cell) {
                return {
                    cellId: cell[CellType.Provisioned].cell_id, 
                    cellInfo: cell,
                    roleName: ROLE_NAME,
                    name: cell[CellType.Provisioned].name,
                    networkSeed: cell[CellType.Provisioned].dna_modifiers.network_seed,
                    displayName: cell[CellType.Provisioned].dna_modifiers.network_seed === "" ? "Public" : cell[CellType.Provisioned].name,
                };
            } else if(CellType.Cloned in cell) {
                return {
                    cellId: cell[CellType.Cloned].cell_id,
                    cellInfo: cell,
                    roleName: cell[CellType.Cloned].clone_id,
                    name: cell[CellType.Cloned].name,
                    networkSeed: cell[CellType.Cloned].dna_modifiers.network_seed,
                    displayName: cell[CellType.Cloned].dna_modifiers.network_seed === "" ? "Public" : cell[CellType.Cloned].name,
                };
            }
        });

        return cellsNormalized;
    }

    create(name: string) {
        return this.client.createCloneCell({
            name,
            role_name: ROLE_NAME,
            modifiers: {
                network_seed: uuidv7(),
            }
        });
    }

    join(name: string, networkSeed: string) {
        return this.client.createCloneCell({
            name,
            role_name: ROLE_NAME,
            modifiers: {
                network_seed: networkSeed 
            }
        });
    }

    disable(cellId: CellId) {
        return this.client.disableCloneCell({ clone_cell_id: cellId });
    }

    enable(cellId: CellId) {
        return this.client.enableCloneCell({ clone_cell_id: cellId })
    }
    
    activate(cellId: CellId) {
        this.activeDnaHash.set(cellId[0]);
    }

    private async _loadActiveDnaHash() {
        const dnaHash = localStorage.getItem("activeDnaHash");
        if(dnaHash !== null && dnaHash !== undefined) {
            this.activeDnaHash.set(decodeHashFromBase64(dnaHash));
        } else {
            const appInfo = await this.client.appInfo();
            const defaultDnaHash = appInfo.cell_info[ROLE_NAME][0][CellType.Provisioned].cell_id[0];
            this.activeDnaHash.set(defaultDnaHash);
        }
    }

    private _saveActiveDnaHash(val: DnaHash) {
        if(val !== undefined && val !== null) {
            localStorage.setItem("activeDnaHash", encodeHashToBase64(val));
        }
    }
}
