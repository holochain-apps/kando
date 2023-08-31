<script lang="ts">
    import { getContext } from "svelte";
    import { KanDoStore } from "./kanDoStore";
    import type { EntryHashB64 } from '@holochain/client';
    import {faSearch } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import '@shoelace-style/shoelace/dist/components/icon/icon.js';
    import '@shoelace-style/shoelace/dist/components/menu/menu.js';
    import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
    import '@shoelace-style/shoelace/dist/components/menu-label/menu-label.js';
    import type { v1 as uuidv1 } from "uuid";
    import type { BoardRecord } from './boardList';
    import { get } from 'svelte/store';

    type FoundCard = {
        board: BoardRecord,
        card: uuidv1,
        title: string,
    }
    let foundCards: Array<FoundCard> = []
    let foundBoards: Array<BoardRecord> = []

    const { getStore } :any = getContext('kdStore');

    const store:KanDoStore = getStore();
    $: boardList = store.boardList.stateStore()
    $: activeHash = store.boardList.activeBoardHash;
    $: state = store.boardList.getReadableBoardState($activeHash);

    const selectBoard = (hash: EntryHashB64) => {
        store.boardList.setActiveBoard(hash)
    }


    const doSearch = (text:string) => {
        foundBoards = []
        foundCards = []
        showSearchResults = true
        if (text == "") return
        const searchText = text.toLocaleLowerCase()
        $boardList.boards.forEach(b=> {
            if (b.name.toLocaleLowerCase().includes(searchText)) foundBoards.push(b)
            const board = store.boardList.getReadableBoardState(b.hash)
            const boardState = get(board)
            boardState.cards.forEach((c)=>{
                if (c.props.title.toLocaleLowerCase().includes(searchText) || c.props.description.toLocaleLowerCase().includes(searchText)) {
                    foundCards.push({
                        board: b,
                        card: c.id,
                        title: c.props.title,
                    })
                }
            })
        })
    }
    const clearSearch = () => {
        searchInput.value = ""
        showSearchResults = false
    }

    let searchInput
    let showSearchResults = false

</script>

<div class="search">

<div style="position:relative; margin-left:10px;">
    <sl-input
        bind:this={searchInput}
        placeholder="Search"
        pill
        on:sl-input={(e)=>doSearch(e.target.value)}
        on:sl-blur={(e)=>showSearchResults=false}
        on:sl-focus={(e)=>doSearch(e.target.value)}
    >
    <span slot="prefix"style="margin-left:10px;"><Fa icon={faSearch}></Fa></span>
    </sl-input>
    {#if showSearchResults && (foundBoards.length>0 || foundCards.length>0)}
    <sl-menu class="search-results"
    >
        {#if foundCards.length>0}
            <sl-menu-label>Cards</sl-menu-label>
            {#each foundCards as found}
                <sl-menu-item
                    on:mousedown={(e)=>{
                        if (found.board.hash != $activeHash) {
                            selectBoard(found.board.hash)
                        }
                        store.boardList.setActiveCard(found.card)
                        clearSearch()
                    }}
                >
                <div style="margin-left:10px;display:flex;flex-direction: column;">
                    <span>{found.title} in {store.getCardGroupName(found.card, $state)}</span>
                    <span style="font-size:70%;color:gray;line-heigth:50%;">Board: {found.board.name}</span>
                </div>
                </sl-menu-item>
            {/each}
        {/if}
        {#if foundBoards.length>0}
            {#if foundCards.length> 0}<sl-divider></sl-divider>{/if}
            <sl-menu-label>Boards</sl-menu-label>
            {#each foundBoards as found}
                <sl-menu-item
                    on:mousedown={(e)=>{
                        if (found.hash != $activeHash) {
                            selectBoard(found.hash)
                        }
                        clearSearch()
                    }}
                >
                <div style="margin-left:10px;">
                    {found.name} 
                </div>
                </sl-menu-item>
            {/each}
        {/if}
    </sl-menu>
    {/if}
</div>

</div>
<style>
  .search {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
  .search-results {
    position: absolute;
    z-index: 10;
    box-shadow: 0px 0px 20px rgba(0, 0, 0, .15);
    }
</style>