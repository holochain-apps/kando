import type { DocumentStore, SessionStore, WorkspaceStore, SynStore } from "@holochain-syn/core";
import { get, type Readable } from "svelte/store";
import { v1 as uuidv1 } from "uuid";
import { type AgentPubKey, type EntryHash, type EntryHashB64, encodeHashToBase64, type AgentPubKeyB64, type Timestamp } from "@holochain/client";
import { BoardType } from "./boardList";
import { cloneDeep } from "lodash";
import type { WALUrl } from "./util";

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
  attachments: Array<WALUrl>
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
  attachments: Array<WALUrl>
}

const MAX_FEED_ITEMS = 50
export type FeedContent = {
  delta: BoardDelta,
  context: any,  // used to hold info important to generating the feed item description
}

export type FeedItem = {
  timestamp: Date,
  content: FeedContent,
  author: AgentPubKeyB64,
}

export type ParsedFeedKey = {
  author: AgentPubKeyB64,
  timestamp: number,
}

export type Feed = {[key: string]: FeedContent}  // key is agent and timestamp to make unique feed keys to prevent collisions

export type BoardEphemeralState = { [key: string]: string };

export const parseFeedKey = (key: string) : ParsedFeedKey => {
  const [author, timestamp] = key.split(".")
  return {author, timestamp: parseInt(timestamp)}
}

export const sortedFeedKeys = (feed: Feed) => {
  const keys = Object.keys(feed)
  return keys.map(key=> parseFeedKey(key)).sort(({timestamp:a},{timestamp:b})=>b-a)
}

export const feedItems = (feed: Feed): FeedItem[] => {
  if (!feed) return []
  const parsedKeys: ParsedFeedKey[] = sortedFeedKeys(feed)
  return parsedKeys.map(({timestamp, author})=> {
    const content = feed[`${author}.${timestamp}`]
    const item: FeedItem = {author,timestamp:new Date(timestamp), content}
    return item
  })
}

export interface BoardState {
  status: string;
  name: string;
  groups: Group[];
  grouping: {[key: string]: Array<uuidv1>}
  cards: Card[];
  labelDefs: LabelDef[];
  categoryDefs: CategoryDef[];
  props: BoardProps;
  boundTo: Array<WALUrl>
  feed: Feed
}
  
  export type BoardDelta =
    | {
        type: "create";
        name: string;
      }
    | {
        type: "set-state";
        state: Partial<BoardState>;
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
        type: "add-group";
        group: Group;
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
        type: "set-card-agents";
        id: uuidv1;
        agents: AgentPubKeyB64[];
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
        type: "add-checklist-item";
        id: uuidv1;
        checklistId: uuidv1;
        item: ChecklistItem;
      }
    | {
        type: "delete-checklist-item";
        id: uuidv1;
        checklistId: uuidv1;
        itemId: number;
      }
    | {
        type: "set-checklist-item-state";
        id: uuidv1;
        checklistId: uuidv1;
        itemId: number;
        state: boolean;
      }
    | {
        type: "convert-checklist-item";
        id: uuidv1;
        checklistId: uuidv1;
        itemId: number;
        card: Card;
        groupId: uuidv1;
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

  const _getCard = (state: BoardState, cardId: uuidv1) : [Card, number] |undefined => {
    const index = state.cards.findIndex((card) => card.id === cardId)
    if (index >=0) {
      return [state.cards[index], index]
    }
    return undefined
  }

  const _getGroup = (state: BoardState, groupId: uuidv1) : [Group, number]|undefined => {
    const index = state.groups.findIndex((g) => g.id === groupId)
    if (index >=0) {
      return [state.groups[index],index]
    }
    return undefined
  }

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
      state.stickies.forEach((sticky)=>ungrouped.push(sticky.id))
      state.grouping[UngroupedId] = ungrouped
    }
    const groupingIds = Object.keys(state.grouping)
    for (const group of state.groups) {
      if (!groupingIds.includes(group.id)) {
        state.grouping[group.id] = []
      }
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

  export const newFeedKey = (author) :string => {
    return `${author}.${Date.now()}`
  }
  const addToFeed = (state: BoardState, author: AgentPubKeyB64, delta: BoardDelta, context: any): BoardState => {
    if (!state.feed) state.feed = {}
    
    state.feed[newFeedKey(author)] = {delta, context}
    const keys = Object.keys(state)
    if (keys.length > MAX_FEED_ITEMS) {
      const keysToRemove = keys.map(key=>{
        const [auth, date] = key.split(".")
        return [auth,parseInt(date)]
      }).sort(([_x, a],[_y,b]) => 
        // @ts-ignore
        a-b).slice(MAX_FEED_ITEMS)
      keysToRemove.forEach( ([a,d])=> delete state.feed[`${a}.${d}`])
    }
    return state
  }

  export const deltaToFeedString = (state: BoardState, content: FeedContent):string => {
    const delta = content.delta
    const context = content.context
    let feedText = ""
    switch (delta.type) {
      case "create": 
        feedText = `created board ${delta.name}`
        break;
      case "set-status": 
        feedText = `set the board status to ${delta.status}`
        break;
      case "set-state":
        feedText = `set the board `
        break;
      case "set-name":
        feedText = `set the board name to ${delta.name}`
        break;
      case "set-props":
        feedText = `upated the board settings`
        break;
      case "add-group":
        feedText = `added column "${delta.group.name}"`
        break;
      case "set-groups":
          feedText =  `updated the columns`
        break;
      case "set-group-order":
        feedText = `reorded the columns`
        break;
      case "set-label-defs":
        feedText = `updated the labels`
        break;
      case "set-category-defs":
        feedText = `updated the categories`
        break;
      case "add-card":
        feedText = `added a card titled "${delta.value.props.title}" to ${context.group.name}`
        break;
      case "update-card-group":{
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {
            const g  =_getGroup(state, delta.group)
            if (g) {
              const [group,i] = g
              if (group) {
                feedText = `moved card "${card.props.title}" to ${group.name}`
              } else {
                feedText = `moved card "${card.props.title}"`
              }
            }
        }}
        if (!feedText) feedText = `moved card "${context.card}"`
        }
        break;
      case "update-card-props":
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {
            feedText = `updated card "${card.props.title}"`
          }
        }
        if (!feedText) feedText = `updated card "${context.card}"`

        break;
      case "set-card-agents": {
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {
            feedText = `updated card "${card.props.title}" assignees`
          }
        }
        if (!feedText) feedText = `updated card "${context.card}" assignees`
        }
        break;
      case "add-card-comment": {
          const c = _getCard(state, delta.id)
          if (c) {
            const [card,i] = c
            if (card) {
              feedText = `added comment to card "${card.props.title}"`
            }
          }
          if (!feedText) feedText = `added a comment to card "${context.card}"`
        }
        break;
      case "update-card-comment":{
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {
            feedText = `updated comment on card "${card.props.title}"`
          };
        }
        if (!feedText) feedText = `updated a comment on card "${context.card}"`
        }
        break;
      case "delete-card-comment": {
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {
            feedText = `deleted comment on card "${card.props.title}"`
          }
        }
        if (!feedText) feedText = `deleted a comment on card "${context.card}"`
        }
        break;
      case "add-card-checklist": {
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {
              feedText = `added a checklist "${delta.checklist.title}" to card "${card.props.title}"`
          }
        }
        if (!feedText) feedText = `added a checklist "${delta.checklist.title}" to card "${context.card}"`
        }
        break;
      case "update-card-checklist":{
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {      
            feedText =  `updated checklist ${delta.title} on card "${card.props.title}"`
        }}
        if (!feedText) feedText = `updated a checklist "${delta.title}" on card "${context.card}"`
        }
        break;
      case "add-checklist-item":{
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {
            const list = card.checklists[delta.checklistId]
            feedText =  `added item "${delta.item.text}" to "${card.props.title}${list?`:${list.title}`:""}"`
        }}
        if (!feedText) feedText = `added checklist item ${delta.item.text} to card "${context.card}"`
        }
        break;
      case "delete-checklist-item":{
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {      
            const list = card.checklists[delta.checklistId]
            if (list) {
              feedText =  `deleted item "${context.item}" from "${card.props.title}:${list.title}"`
            }
        }}
        if (!feedText) feedText = `deleted a checklist item from card "${context.card}"`
        }
        break;
      case "set-checklist-item-state":{
        const itemStateStr = delta.state ? "Checked" : "Unchecked"
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {      
            const list = card.checklists[delta.checklistId]
            if (list) {
              const item = list.items[delta.itemId]
              feedText =  `set item ${item ? ` "${item.text}"`:""} on "${card.props.title}: ${list.title}" to ${itemStateStr}`
            }
        }}
        if (!feedText) feedText = `set item a checklist item from card "${context.card}" to ${itemStateStr}`
        }
        break;
      case "convert-checklist-item":{
        const c = _getCard(state, delta.id)
        if (c) {
          const [card,i] = c
          if (card) {      
            const list = card.checklists[delta.checklistId]
            if (list) {
              const item = list.items[delta.itemId]
              feedText =  `converted item "${context.item}" from "${card.props.title}: ${list.title}" to a card`
            }
        }}
        if (!feedText) feedText = `converted a checklist item from card "${context.card}" to a card`
        }
        break;      
      case "delete-card-checklist":
        feedText =  `deleted checklist ${context.checklist} on card "${context.card}"`
        break;
      case "delete-card":
        feedText = `deleted card "${context.card}"`
        break;
    }
    return feedText
  }

  const _addCard = (state: BoardState, card:Card, gropuId: uuidv1) => {
    _initGrouping(state)
    state.cards.push(card)
    if (state.grouping[gropuId] !== undefined) {
      state.grouping[gropuId].push(card.id)
    }
    else {
      state.grouping[gropuId] = [gropuId.id]
    }
  }
  
  export const boardGrammar = {
    initialState(init: Partial<BoardState>|undefined = undefined)  {
      const state: BoardState = {
        status: "",
        name: "untitled",
        groups: [{id:UngroupedId, name:""}],
        grouping: {},
        cards: [],
        labelDefs: [],
        categoryDefs: [],
        props: {bgUrl:"", attachments:[]},
        boundTo: [],
        feed: {}
      }
      if (init) {
        Object.assign(state, init);
      }
      _initGrouping(state)
      return state
    },

    applyDelta( 
      delta: BoardDelta,
      state: BoardState,
      _ephemeralState: any,
      author: AgentPubKeyB64
    ) {
      let feedContext = null
      switch (delta.type) {
        case "set-status":
          state.status = delta.status
          break;
        case "set-state":
          if (delta.state.status !== undefined) state.status = delta.state.status
          if (delta.state.name !== undefined) state.name = delta.state.name
          if (delta.state.groups !== undefined) {
            state.groups = delta.state.groups
            _setGroups(delta.state.groups, state)
          } else if (!state.groups) {
            state.groups = []
          }
          if (delta.state.cards !== undefined) state.cards = delta.state.cards
          if (delta.state.labelDefs !== undefined) state.labelDefs = delta.state.labelDefs
          if (delta.state.categoryDefs !== undefined) state.categoryDefs = delta.state.categoryDefs
          if (delta.state.props !== undefined) state.props = delta.state.props
          if (delta.state.boundTo !== undefined) state.boundTo = delta.state.boundTo
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
        case "add-group":
          _initGrouping(state)
          state.groups.push(delta.group)
          state.grouping[delta.group.id] = []
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
          _addCard(state, delta.value, delta.group)
          const g  =_getGroup(state, delta.group)
          if (g) {
            const [group,i] = g
            if (group) {
              feedContext = {group: cloneDeep(group)}
            }
          }
          break;
        case "update-card-group":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            _removeCardFromGroups(state, delta.id)
            _addCardToGroup(state, delta.group, delta.id, delta.index)
            feedContext = {card: card.props.title}
          }}
          break;
        case "update-card-props":
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            state.cards[i].props = delta.props;
            feedContext = {card: card.props.title}
          }
          break;
        case "set-card-agents": {
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            state.cards[i].props.agents = delta.agents;
            feedContext = {card: card.props.title}
          }
          }
          break;
        case "add-card-comment": {
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            state.cards[i].comments[delta.comment.id] = delta.comment;
            feedContext = {card: card.props.title}
          }
          }
          break;
        case "update-card-comment":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
              const existingComment = state.cards[i].comments[delta.commentId]
              if (existingComment) {
                const comment = {
                  id:delta.commentId,
                  agent:existingComment.agent,
                  text: delta.text,
                  timestamp: new Date().getTime()
                }
                state.cards[i].comments[delta.commentId] = comment
                feedContext = {card: card.props.title}
              }
          };
          }
          break;
        case "delete-card-comment": {
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            delete state.cards[i].comments[delta.commentId]
            feedContext = {card: card.props.title}
            }
          }
          break;
        case "add-card-checklist": {
          const [card,i] = _getCard(state, delta.id)
          if (card) {
              state.cards[i].checklists[delta.checklist.id] = delta.checklist;
              feedContext = {card: card.props.title}
            }
          }
          break;
        case "update-card-checklist":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
              const checklist = state.cards[i].checklists[delta.checklistId]
              if (checklist) {
                state.cards[i].checklists[delta.checklistId] = {
                  id:delta.checklistId,
                  title: delta.title,
                  items: delta.items,
                  timestamp: new Date().getTime(),
                  order: delta.order,
                }
                feedContext = {card: card.props.title}
              }
          }};
          break;
        case "add-checklist-item":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            const checklist = state.cards[i].checklists[delta.checklistId]
            if (checklist) {
              checklist.items.push(delta.item)
              feedContext = {card: card.props.title}
            }
          }
          break;
        }
        case "delete-checklist-item":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            const checklist = state.cards[i].checklists[delta.checklistId]
            if (checklist) {
              const removed = checklist.items.splice(delta.itemId,1)
              feedContext = {card: card.props.title, item:removed[0]? removed[0].text:""}
            }
          }
          break;
        }
        case "set-checklist-item-state":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            const checklist = state.cards[i].checklists[delta.checklistId]
            if (checklist) {
              if (checklist.items[delta.itemId] && checklist.items[delta.itemId].checked != delta.state) {
                state.cards[i].checklists[delta.checklistId].items[delta.itemId].checked = delta.state
                feedContext = {card: card.props.title}
              }
            }
          }
          break;
        }
        case "convert-checklist-item":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            const checklist = state.cards[i].checklists[delta.checklistId]
            if (checklist) {
              const removed = checklist.items.splice(delta.itemId,1)
              if (removed[0]) {
                _addCard(state, delta.card, delta.groupId)
                feedContext = {card: card.props.title, item:removed[0]? removed[0].text:""}
              }
            }
          }
          break;
        }
        case "delete-card-checklist":{
          const [card,i] = _getCard(state, delta.id)
          if (card) {
              feedContext = {checklist: card.checklists[delta.checklistId].title, card:card.props.title}
              delete card.checklists[delta.checklistId]
            }
          };
          break;
        case "delete-card": {
          const [card,i] = _getCard(state, delta.id)
          if (card) {
            state.cards.splice(i,1)
            _removeCardFromGroups(state, delta.id)
            feedContext = {card: card.props.title}
          }
          }
          break;
      }
      state = addToFeed(state, author, delta, feedContext)
    },
  };
  
export type BoardStateData = {
  hash: EntryHash,
  state: BoardState,
}
  
export class Board {
  public session: SessionStore<BoardState,BoardEphemeralState> | undefined
  public hashB64: EntryHashB64
  public myAgentKeyB64: AgentPubKeyB64

  constructor(
    public document: DocumentStore<BoardState, BoardEphemeralState>, 
    public workspace: WorkspaceStore<BoardState,BoardEphemeralState>,
    public myAgentKey: AgentPubKey
    ) {
      this.hashB64 = encodeHashToBase64(this.document.documentHash)
      this.myAgentKeyB64 = encodeHashToBase64(myAgentKey)
    }

  public static async Create(synStore: SynStore, init: Partial<BoardState>|undefined = undefined) {
    const initState = boardGrammar.initialState(init)
  
    const documentStore = await synStore.createDocument(initState,{})

    await synStore.client.tagDocument(documentStore.documentHash, BoardType.active)

    const workspaceStore = await documentStore.createWorkspace(
        `${new Date}`,
        undefined
       );

    const me = new Board(documentStore, workspaceStore, synStore.client.client.myPubKey);

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
          try {
            boardGrammar.applyDelta(delta, state,_eph, this.myAgentKeyB64)
          } catch (e) {
            console.log("Error applying delta:",e, delta)
          }
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
