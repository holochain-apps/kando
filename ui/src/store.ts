import {
    type AppAgentClient,
    type EntryHash,
    type AgentPubKeyB64,
    type AppAgentCallZomeRequest,
    type RoleName,
    encodeHashToBase64,
    type EntryHashB64,
    type AgentPubKey,
    decodeHashFromBase64,
    type Timestamp,
    type DnaHash,
  } from '@holochain/client';
import { SynStore,  SynClient} from '@holochain-syn/core';
import { BoardList } from './boardList';
import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { v1 as uuidv1 } from "uuid";
import { derived, get, writable, type Unsubscriber, type Writable } from "svelte/store";
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import type { BoardState } from './board';
import type { WeClient } from '@lightningrodlabs/we-applet';
import { HoloHashMap } from '@holochain-open-dev/utils';
import { getMyDna } from './util';


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
    tips: HoloHashMap<EntryHash,EntryHash>,
    latestComment: {[key: string]: Timestamp}
    notifications: {[key: string]: NotificationType}
  }

export class KanDoStore {
    myAgentPubKeyB64: AgentPubKeyB64
    timeAgo = new TimeAgo('en-US')
    service: KanDoService;
    boardList: BoardList;
    updating = false
    synStore: SynStore;
    client: AppAgentClient;
    uiProps: Writable<UIProps>
    unsub: Unsubscriber
    dnaHash: DnaHash

    constructor(
        public weClient : WeClient,
        public profilesStore: ProfilesStore,
        protected clientIn: AppAgentClient,
        protected roleName: RoleName,
        protected zomeName: string = ZOME_NAME
    ) {
        this.client = clientIn
        getMyDna(roleName, clientIn).then(res=>{
            this.dnaHash = res
          })

        this.myAgentPubKeyB64 = encodeHashToBase64(this.client.myPubKey);
        this.service = new KanDoService(
          this.client,
          this.roleName,
          this.zomeName
        );
        this.synStore = new SynStore(new SynClient(this.client,this.roleName,this.zomeName))
        this.uiProps = writable({
            showArchived: {},
            showMenu: true,
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
        this.boardList = new BoardList(profilesStore, this.synStore, weClient, derived(this.uiProps, props=>props.notifications))
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
            return "Archived"
        }
        const g = (state.groups.find((g)=>g.id == gId))
        if (g) {
            return g.name
        }
        return "Unknown"
    }

}