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
  } from '@holochain/client';
import { SynStore,  SynClient, type Commit } from '@holochain-syn/core';
import { BoardList } from './boardList';
import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { v1 as uuidv1 } from "uuid";
import { get, writable, type Writable } from "svelte/store";
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import type { BoardState } from './board';
import type { WeClient } from '@lightningrodlabs/we-applet';
import { HoloHashMap } from '@holochain-open-dev/utils';


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
    tips: HoloHashMap<EntryHash,EntryHash>
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

    updateTip(boardHash: EntryHash) {
        const boardData = get(this.boardList.boardData2.get(boardHash))
        if (boardData.status == "complete") {
            localStorage.setItem(encodeHashToBase64(boardHash), encodeHashToBase64(boardData.value.tip))
            this.setTip(boardHash, boardData.value.tip)
        }
    }

    setTip(boardHash:EntryHash, tip: EntryHash) {
        this.uiProps.update((n) => {
            n.tips.set(boardHash,tip)
            return n
        })
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

    constructor(
        public weClient : WeClient,
        public profilesStore: ProfilesStore,
        protected clientIn: AppAgentClient,
        protected roleName: RoleName,
        protected zomeName: string = ZOME_NAME
    ) {
        this.client = clientIn
        this.myAgentPubKeyB64 = encodeHashToBase64(this.client.myPubKey);
        this.service = new KanDoService(
          this.client,
          this.roleName,
          this.zomeName
        );
        this.synStore = new SynStore(new SynClient(this.client,this.roleName,this.zomeName))
        this.boardList = new BoardList(profilesStore, this.synStore)
        this.uiProps = writable({
            showArchived: {},
            showMenu: true,
            tips: new HoloHashMap,
        })
        for (let i = 0; i < localStorage.length; i++){
            const boardHashB64 = localStorage.key(i)
            const tipB64 = localStorage.getItem(boardHashB64)
            this.setTip(decodeHashFromBase64(boardHashB64), decodeHashFromBase64(tipB64))
        }

    }

    getCardGroupName(cardId: uuidv1, state: BoardState) : string  {
        const keyValPairs = Object.entries(state.grouping)
        for (const [gId, cardIds] of keyValPairs) {
            if (cardIds.includes(cardId)) {
                if (gId=="_") return "Archived"
                const g = (state.groups.find((g)=>g.id == gId))
                if (g) {
                    return g.name
                }
            }
        }
        return "Unknown"
    }

}