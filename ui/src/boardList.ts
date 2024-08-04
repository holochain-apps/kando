import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import { type EntryHash, type EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import {toPromise, type AsyncReadable, pipe, joinAsync, asyncDerived, sliceAndJoin, alwaysSubscribed} from '@holochain-open-dev/stores'
import { SynStore, WorkspaceStore, stateFromCommit } from "@holochain-syn/core";
import type { ProfilesStore } from "@holochain-open-dev/profiles";
import { cloneDeep } from "lodash";
import { Board, feedItems, type BoardState, deltaToFeedString, feedItemShouldNotify, MAX_FEED_ITEMS } from "./board";
import { hashEqual } from "./utils/util";
import type { WeaveClient } from "@lightningrodlabs/we-applet";
import { NotificationType, SeenType } from "./stores/kando";

export enum BoardType {
    active = "active",
    archived = "archived",
    deleted = "deleted"
}

export interface TypedHash {
    hash: EntryHash
    type: BoardType
}

export interface BoardAndLatestState {
    board: Board,
    latestState: BoardState,
    tip: EntryHash,
}

export class BoardList {
    activeCard: Writable<string| undefined> = writable(undefined)
    activeBoardHashes: AsyncReadable<EntryHash[]>
    archivedBoardHashes: AsyncReadable<EntryHash[]>
 //   typedHashes: AsyncReadable<Array<TypedHash>>
    activeBoard: Writable<Board| undefined> = writable(undefined)
    allBoards: AsyncReadable<ReadonlyMap<Uint8Array, BoardAndLatestState>>
    activeBoardHash: Writable<EntryHash| undefined> = writable(undefined)
    activeBoardHashB64: Readable<string| undefined> = derived(this.activeBoardHash, s=> s ? encodeHashToBase64(s): undefined)
    boardCount: AsyncReadable<number>
    notifiedItems: {[key:string]: number}
    lastNotifiedCount: number
    notificationsInterval = setInterval(() => {


        // update the saved notified items in the local store
        let entries = Object.entries(this.notifiedItems)

        if (this.lastNotifiedCount != entries.length) {
            entries = entries.sort(([_ka,a],[_kb,b])=>b-a)
            
            if (entries.length > MAX_FEED_ITEMS) {
                for (let i = MAX_FEED_ITEMS;i<entries.length;i+=1) {
                    const [key,_ ] = entries[i]
                    delete this.notifiedItems[key]
                }
            }
            this.lastNotifiedCount = Object.keys(this.notifiedItems).length

            localStorage.setItem("notifiedItems",JSON.stringify(this.notifiedItems))
        }
      }, 10000);

    boardData2 = new LazyHoloHashMap( documentHash => {
        const docStore = this.synStore.documents.get(documentHash)

        const board = pipe(docStore.allWorkspaces,
            workspaces => {
                const board = new Board(docStore,  new WorkspaceStore(docStore, Array.from(workspaces.keys())[0]), this.synStore.client.client.myPubKey)
                if (this.weaveClient) {
                    board.workspace.tip.subscribe((tip)=>{
                        try {
                            if (tip.status=="complete" && tip.value) {
                                const tipRecord = tip.value
                                const tipB64 = encodeHashToBase64(tipRecord.entryHash)
                                const key = `${SeenType.Tip}:${board.hashB64}`
                                const seenTipB64 = localStorage.getItem(key)

                                if (tipB64 != seenTipB64) {
                                    const boardState = stateFromCommit(tipRecord.entry) as BoardState
                                    const feed = feedItems(boardState.feed)
                                    const me = encodeHashToBase64(this.synStore.client.client.myPubKey)
                                    const notifications = []
                                    feed.forEach(feedItem=> {
                                        const timestamp = feedItem.timestamp.getTime()
                                        const key = `${feedItem.author}.${timestamp}`
                                        if (!this.notifiedItems[key] ) {
                                            const notifyType:NotificationType = feedItemShouldNotify(me, boardState, feedItem, get(this.notifications))
                                            if (notifyType) {
                                                let body = `${feedItem.author} ${deltaToFeedString(boardState, feedItem.content)}`
                                                if (feedItem.content.delta.type == 'set-card-agents') {
                                                    body=`${body} to:`
                                                    feedItem.content.delta.agents.forEach(agent=>body=`${body} ${agent}`)
                                                }
                                                notifications.push({
                                                    title: `${boardState.name} updated`,
                                                    body,
                                                    notification_type: "change",
                                                    icon_src: undefined,
                                                    urgency: notifyType,
                                                    timestamp
                                                })
                                            }
                                            this.notifiedItems[key] = timestamp
                                        }
                                    })
                                    if (notifications.length > 0) {
                                        this.weaveClient.notifyFrame(notifications)
                                    }
                                }
                            }
                        } catch(e) {
                            console.log("Error sending notification to frame", e)
                        }
                    })
                }
                return board
            }
        )
        const latestState = pipe(board, 
            board => board.workspace.latestState
            )
        const tip = pipe(board,
            board => board.workspace.tip
            )

        return alwaysSubscribed(pipe(joinAsync([board, latestState, tip]), ([board, latestState, tip]) => {
            return {board,latestState, tip: tip ? tip.entryHash: undefined}}))
    })
        
    constructor(public profilesStore: ProfilesStore, public synStore: SynStore, public weaveClient : WeaveClient, public notifications: Readable<{[key: string]: NotificationType}>) {
    
        const boardHashes = asyncDerived(this.synStore.documentsByTag.get(BoardType.active),x=>Array.from(x.keys()))
        this.activeBoardHashes = boardHashes
        const archivedHashes = asyncDerived(this.synStore.documentsByTag.get(BoardType.archived),x=>Array.from(x.keys()))
        this.archivedBoardHashes = archivedHashes

        // const activeTypedHashes = asyncDerived(boardHashes, hashes=>hashes.map(hash=>{const h:TypedHash = {hash, type:BoardType.active}; return h}))
        // const archivedTypedHashes = asyncDerived(archivedHashes, hashes=>hashes.map(hash=>{const h:TypedHash = {hash,type:BoardType.archived}; return h}))

        // const joinedTyped = joinAsync([activeTypedHashes, archivedTypedHashes])
        // this.typedHashes = asyncDerived(joinedTyped, 
        //     ([active,archived]) => [...active, ...archived]
        //     )

        const joined = joinAsync([boardHashes, archivedHashes])

        const asyncJoined = asyncDerived(joined, 
            ([boards,archived]) => [...boards, ...archived]
            )
        this.allBoards = pipe(asyncJoined,
            docHashes => {
                return sliceAndJoin(this.boardData2, docHashes, {errors: "filter_out"})
            }
        )
        this.boardCount =  asyncDerived(joined,
            ([boards,archived]) => boards.length + archived.length
        )

        const notifiedItemsEncoded = localStorage.getItem("notifiedItems")
        if (notifiedItemsEncoded) this.notifiedItems = JSON.parse(notifiedItemsEncoded)
        else this.notifiedItems = {}
        this.lastNotifiedCount = Object.keys(this.notifiedItems).length
    }
    
    async getBoard(documentHash: EntryHash) : Promise<Board | undefined> {
        if (!documentHash) return undefined
        const board = await toPromise(this.boardData2.get(documentHash))
        return board.board
    }

    async setActiveCard(cardId: string | undefined) {
        this.activeCard.update((n) => {return cardId} )
    }

    async setActiveBoard(hash: EntryHash | undefined) : Promise<Board | undefined> {
        let board: Board | undefined = undefined
        const current = get(this.activeBoard)
        // if no change then don't update
        if (!current && !hash) return
        if (current && hash && hashEqual(hash, current.hash)) return

        if (hash) {
            board = (await toPromise(this.boardData2.get(hash))).board
            if (board) {
                await board.join()
                console.log("joined")
                this.activeBoard.update((n) => {return board} )
            } else {
                console.log("Board not found on setActiveBoard")
            }
        } else {
            this.activeBoard.update((n) => {return undefined} )
        }
        this.activeBoardHash.update((n) => {return hash} )

        return board
    }

    async archiveBoard(documentHash: EntryHash) : Promise<boolean> {
        let wasActive = false
        await this.synStore.client.removeDocumentTag(documentHash, BoardType.active)
        await this.synStore.client.tagDocument(documentHash, BoardType.archived)
        if (encodeHashToBase64(get(this.activeBoardHash)) == encodeHashToBase64(documentHash)) {
            await this.setActiveBoard(undefined)
            wasActive = true
        }
        return wasActive
    }

    async unarchiveBoard(documentHash: EntryHash) {
        await this.synStore.client.removeDocumentTag(documentHash, BoardType.archived)
        await this.synStore.client.tagDocument(documentHash, BoardType.active)
    }

    async deleteBoard(documentHash: EntryHash) {
        await this.synStore.client.removeDocumentTag(documentHash, BoardType.active)
        await this.synStore.client.removeDocumentTag(documentHash, BoardType.archived)
        await this.synStore.client.tagDocument(documentHash, BoardType.deleted)
        if (encodeHashToBase64(get(this.activeBoardHash)) == encodeHashToBase64(documentHash)) {
            await this.setActiveBoard(undefined)
        }
    }

    async closeActiveBoard(leave: boolean) {
        const hash = get(this.activeBoardHash)
        if (hash) {
            if (leave) {
                const board = await this.getBoard(hash)
                if (board) await board.leave()
                else console.log("Board Not Found on closeActiveBoard")
            }
            this.setActiveBoard(undefined)
        }
    }

    async cloneBoard(board: BoardState, name: string | undefined) : Promise<Board>  {
        const newBoard = cloneDeep(board) as BoardState
        newBoard.cards = []
        newBoard.feed = {}
        newBoard.boundTo = []
        newBoard.props.attachments = []

        Object.keys(newBoard.grouping).forEach(key=>newBoard.grouping[key] = [])
        newBoard.name = name ? name : `copy of ${newBoard.name}`
        return this.makeBoard(newBoard)
    }

    async makeBoard(options: Partial<BoardState>, fromHash?: EntryHashB64) : Promise<Board> {
        if (!options.name) {
            options.name = "untitled"
        }
        const board = await Board.Create(this.synStore, options)
        return board
    }
}
