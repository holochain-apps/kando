import type { DocumentStore, SessionStore, WorkspaceStore, SynStore } from "@holochain-syn/core";
import { get, type Readable } from "svelte/store";
import { v1 as uuidv1 } from "uuid";
import { type AgentPubKey, type EntryHash, type EntryHashB64, encodeHashToBase64, type AgentPubKeyB64, type Timestamp } from "@holochain/client";
import { BoardType } from "./boardList";
import type { HrlB64WithContext } from "@lightningrodlabs/we-applet";

export class LabelDef {
    type: uuidv1
    constructor(public emoji: string, public toolTip: string){
        this.type = uuidv1()
    }
}

export class CategoryDef {
  type: uuidv1
  constructor(public name: string, public color: string){
      this.type = uuidv1()
  }
}

export type CardProps = {
  title: string,
  description: string,
  category: uuidv1,
  agents: Array<EntryHashB64>,
  labels: Array<uuidv1>,
  attachments: Array<HrlB64WithContext>
}

export type Comment = {
  id: uuidv1;
  agent: AgentPubKeyB64,
  text: string,
  timestamp: Timestamp
}

export type ChecklistItem = {
  checked: boolean,
  text: string,
}

export type Checklist = {
  id: uuidv1;
  timestamp: Timestamp
  order: number,
  title: string,
  items: Array<ChecklistItem>  
}

export type Checklists = {[key: string]: Checklist}
export type Comments = {[key: string]: Comment}

export type Card = {
    id: uuidv1;
    props: CardProps;
    comments: Comments
    checklists: Checklists
    creator: AgentPubKeyB64
};
  
export const UngroupedId = "_"
export class Group {
      id: uuidv1
      constructor(public name: string) {
          this.id =  uuidv1()
      }
}
export type BoardProps = {
  bgUrl: string,
}

export type BoardEphemeralState = { [key: string]: string };

export interface BoardState {
  status: string;
  name: string;
  groups: Group[];
  grouping: {[key: string]: Array<uuidv1>}
  cards: Card[];
  labelDefs: LabelDef[];
  categoryDefs: CategoryDef[];
  props: BoardProps;
}
  
  export type BoardDelta =
    | {
        type: "set-state";
        state: BoardState;
      }
    | {
        type: "set-status";
        status: string;
      }
    | {
        type: "add-card";
        group: uuidv1;
        value: Card;
      }
    | {
        type: "set-name";
        name: string;
      }
    | {
        type: "set-groups";
        groups: Group[];
      }
    | {
        type: "set-props";
        props: BoardProps;
      }
    | {
        type: "set-label-defs";
        labelDefs: LabelDef[];
      }
      | {
        type: "set-category-defs";
        categoryDefs: CategoryDef[];
      }
    | {
        type: "set-group-order";
        id: uuidv1;
        order: Array<uuidv1>;
      }
    | {
        type: "update-card-group";
        id: uuidv1;
        group: uuidv1;
        index: undefined | number
      }
    | {
        type: "update-card-props";
        id: uuidv1;
        props: CardProps;
      }
    | {
        type: "add-card-comment";
        id: uuidv1;
        comment: Comment;
      }
    | {
        type: "update-card-comment";
        id: uuidv1;
        commentId: uuidv1;
        text: string;
      }
    | {
        type: "delete-card-comment";
        id: uuidv1;
        commentId: uuidv1;
      }
      | {
        type: "add-card-checklist";
        id: uuidv1;
        checklist: Checklist;
      }
    | {
        type: "update-card-checklist";
        id: uuidv1;
        checklistId: uuidv1;
        title: string;
        items: Array<ChecklistItem>;
        order: number;
      }
    | {
        type: "delete-card-checklist";
        id: uuidv1;
        checklistId: uuidv1;
      }
    | {
        type: "delete-card";
        id: string;
      };
  
  const _removeCardFromGroups = (state: BoardState, cardId: uuidv1) => {
    _initGrouping(state)
    // remove the item from the group it's in
    Object.entries(state.grouping).forEach(([groupId, itemIds]) =>{
      //@ts-ignore
      const index = itemIds.findIndex((id) => id === cardId)
      if (index >= 0) {
        state.grouping[groupId].splice(index,1)
      }
    })
  }
  const _addCardToGroup = (state: BoardState, groupId: uuidv1, cardId: uuidv1, index: undefined|number) => {
    _initGrouping(state)
    // add it to the new group
    if (state.grouping[groupId] !== undefined) {
      if (index === undefined || index >= state.grouping[groupId].length) {
        state.grouping[groupId].push(cardId)
      } else {
        state.grouping[groupId].splice(index, 0, cardId)
      }
    }
    else {
      state.grouping[groupId] = [cardId]
    }
  }
  const _initGrouping = (state) => {
    if (state.grouping === undefined) {
      state.grouping = {}
      const ungrouped = []
      state.cards.forEach((card)=>ungrouped.push(card.id))
      state.grouping[UngroupedId] = ungrouped
    }
  }
  const _setGroups = (newGroups, state) => {
    state.groups = newGroups
    if (state.groups === undefined) state.groups = []
    const idx = newGroups.findIndex((group) => group.id === UngroupedId)
    if (idx == -1) {
      state.groups.unshift({id:UngroupedId, name:""})
    }
    const idList = {}
    newGroups.forEach(group => {
      idList[group.id] = true
      // add an entry to the groupings for any new groups
      if (state.grouping[group.id] === undefined) {
        state.grouping[group.id] = []
      }
    })

    // remove any non-existent grouping lists
    Object.entries(state.grouping).forEach(([groupId, itemIds]) => {
      if (groupId != UngroupedId) {
        if (!idList[groupId]) {
          delete state.grouping[groupId]
          // move items from deleted groups to the ungrouped group
          state.grouping[UngroupedId] = state.grouping[UngroupedId].concat(itemIds)
        }
      }
    })
  }

  export const boardGrammar = {
    initialState()  {
      const state = {
        status: "",
        name: "untitled",
        groups: [{id:UngroupedId, name:""}],
        cards: [],
        labelDefs: [],
        categoryDefs: [],
        props: {bgUrl:""},
      }
      _initGrouping(state)
      return state
    },
    applyDelta( 
      delta: BoardDelta,
      state: BoardState,
      _ephemeralState: any,
      _author: AgentPubKey
    ) {
      switch (delta.type) {
        case "set-status":
          state.status = delta.status
          break;
        case "set-state":
          if (delta.state.status !== undefined) state.status = delta.state.status
          if (delta.state.name !== undefined) state.name = delta.state.name
          if (delta.state.groups !== undefined) state.groups = delta.state.groups
          _setGroups(delta.state.groups, state)
          if (delta.state.cards !== undefined) state.cards = delta.state.cards
          if (delta.state.labelDefs !== undefined) state.labelDefs = delta.state.labelDefs
          if (delta.state.categoryDefs !== undefined) state.categoryDefs = delta.state.categoryDefs
          if (delta.state.props !== undefined) state.props = delta.state.props
          if (delta.state.grouping !== undefined) {
            state.grouping = delta.state.grouping
          } else if (state.grouping === undefined) {
            _initGrouping(state)
          }
          break;
        case "set-name":
          state.name = delta.name
          break;
        case "set-props":
          state.props = delta.props
          break;
        case "set-groups":
          _initGrouping(state)
          _setGroups(delta.groups, state)
          break;
        case "set-group-order":
          _initGrouping(state)
          state.grouping[delta.id] = delta.order
          break;
        case "set-label-defs":
          state.labelDefs = delta.labelDefs
          break;
        case "set-category-defs":
          state.categoryDefs = delta.categoryDefs
          break;
        case "add-card":
          _initGrouping(state)
          state.cards.push(delta.value)
          if (state.grouping[delta.group] !== undefined) {
            state.grouping[delta.group].push(delta.value.id)
          }
          else {
            state.grouping[delta.group] = [delta.value.id]
          }
          break;
        case "update-card-group":
          _removeCardFromGroups(state, delta.id)
          _addCardToGroup(state, delta.group, delta.id, delta.index)
          break;
        case "update-card-props":
          state.cards.forEach((card, i) => {
            if (card.id === delta.id) {
              state.cards[i].props = delta.props;
            }
          });
          break;
        case "add-card-comment":
          state.cards.forEach((card, i) => {
            if (card.id === delta.id) {
              state.cards[i].comments[delta.comment.id] = delta.comment;
            }
          });
          break;
        case "update-card-comment":
          state.cards.forEach((card, i) => {
            if (card.id === delta.id) {
              const existingComment = state.cards[i].comments[delta.commentId]
              if (existingComment) {
                const comment = {
                  id:delta.commentId,
                  agent:existingComment.agent,
                  text: delta.text,
                  timestamp: new Date().getTime()
                }
                state.cards[i].comments[delta.commentId] = comment
              }
          }});
          break;
        case "delete-card-comment":
          state.cards.forEach((card, i) => {
            if (card.id === delta.id) {
              delete state.cards[i].comments[delta.commentId]
            }
          });
          break;
        case "add-card-checklist":
          state.cards.forEach((card, i) => {
            if (card.id === delta.id) {
              state.cards[i].checklists[delta.checklist.id] = delta.checklist;
            }
          });
          break;
        case "update-card-checklist":
          state.cards.forEach((card, i) => {
            if (card.id === delta.id) {
              const checklist = state.cards[i].checklists[delta.checklistId]
              if (checklist) {
                state.cards[i].checklists[delta.checklistId] = {
                  id:delta.checklistId,
                  title: delta.title,
                  items: delta.items,
                  timestamp: new Date().getTime(),
                  order: delta.order,
                }
              }
          }});
          break;
        case "delete-card-checklist":
          state.cards.forEach((card, i) => {
            if (card.id === delta.id) {
              delete state.cards[i].checklists[delta.checklistId]
            }
          });
          break;
        case "delete-card":
          const index = state.cards.findIndex((card) => card.id === delta.id)
          state.cards.splice(index,1)
          _removeCardFromGroups(state, delta.id)
          break;
      }
    },
  };
  
export type BoardStateData = {
  hash: EntryHash,
  state: BoardState,
}
  
export class Board {
  public session: SessionStore<BoardState,BoardEphemeralState> | undefined
  public hashB64: EntryHashB64

  constructor(public document: DocumentStore<BoardState, BoardEphemeralState>, public workspace: WorkspaceStore<BoardState,BoardEphemeralState>) {
    this.hashB64 = encodeHashToBase64(this.document.documentHash)
  }

  public static async Create(synStore: SynStore) {
    const initState = boardGrammar.initialState()
    console.log("creating", initState)
    const documentStore = await synStore.createDocument(initState,{})

    await synStore.client.tagDocument(documentStore.documentHash, BoardType.active)

    const workspaceStore = await documentStore.createWorkspace(
        `${new Date}`,
        undefined
       );

    const me = new Board(documentStore, workspaceStore);
    await me.join()
    return me
  }

  get hash() : EntryHash {
    return this.document.documentHash
  }

  async join() {
    if (! this.session) 
      this.session = await this.workspace.joinSession()
    console.log("JOINED", this.session)
  }
  
  async leave() {
    if (this.session) {
      this.session.leaveSession()
      this.session = undefined
      console.log("LEFT SESSION")
    }
  }

  state(): BoardState | undefined {
      if (!this.session) {
        return undefined
      } else {
        return get(this.session.state)
      }
  }

  readableState(): Readable<BoardState> | undefined {
    if (!this.session) {
      return undefined
    } else {
      return this.session.state
    }
  }

  requestChanges(deltas: Array<BoardDelta>) {
      console.log("REQUESTING BOARD CHANGES: ", deltas)
      this.session.change((state,_eph)=>{
        for (const delta of deltas) {
          boardGrammar.applyDelta(delta, state,_eph, undefined)
        }
      })
  }

  sessionParticipants() {
    return this.workspace.sessionParticipants
  }

  participants()  {
    if (!this.session) {
      return undefined
    } else {
      return this.session._participants
    }
  }
  async commitChanges() {
      this.session.commitChanges()
  }

}
