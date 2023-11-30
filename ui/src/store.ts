import {
    type AppAgentClient,
    type EntryHash,
    type AgentPubKeyB64,
    type AppAgentCallZomeRequest,
    type RoleName,
    encodeHashToBase64,
    type EntryHashB64,
    type AgentPubKey,
  } from '@holochain/client';
import { SynStore,  SynClient, type Commit } from '@holochain-syn/core';
import { BoardList } from './boardList';
import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { v1 as uuidv1 } from "uuid";
import { get, writable, type Writable } from "svelte/store";
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import type { BoardState } from './board';


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
    recent: Array<EntryHashB64>
  }

export class KanDoStore {
    myAgentPubKeyB64: AgentPubKeyB64
    timeAgo = new TimeAgo('en-US')
    service: KanDoService;
    boardList: BoardList;
    updating = false
    synStore: SynStore;
    client: AppAgentClient;
    uiProps: Writable<UIProps> = writable({
        showArchived: {},
        showMenu: true,
        recent: []
    })

    setUIprops(props:{}) {
        this.uiProps.update((n) => {
            Object.keys(props).forEach(key=>n[key] = props[key])
            return n
        })
    }

    setActiveBoard(hash:EntryHash) {
        const hashB64 = encodeHashToBase64(hash)
        const recent = get(this.uiProps).recent
        const idx = recent.findIndex(h=>h===hashB64)
        if (idx >=0) {
            recent.splice(idx,1)
        }
        recent.unshift(hashB64)
        recent.splice(6);
        this.setUIprops({recent})
        this.boardList.setActiveBoard(hash)
    }

    get myAgentPubKey(): AgentPubKey {
        return this.client.myPubKey;
    }

    constructor(
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