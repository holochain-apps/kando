<script lang="ts">
    import { Menu, List, ListItem } from 'svelte-materialify';
    import { getContext } from "svelte";
    import type { KanDoStore } from "./kanDoStore";
    import type { EntryHashB64 } from '@holochain/client';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import { faArchive, faChevronDown, faFileImport, faSearch, faSquarePlus } from '@fortawesome/free-solid-svg-icons';
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
    let newBoardDialog
    let foundCards: Array<FoundCard> = []
    let foundBoards: Array<BoardRecord> = []

    const { getStore } :any = getContext('tsStore');

    const store:KanDoStore = getStore();
    $: boardList = store.boardList.stateStore()
    $: activeHash = store.boardList.activeBoardHash;
    $: state = store.boardList.getReadableBoardState($activeHash);
    $: archivedBoards = $boardList.boards.findIndex((board)=>board.status === "archived") >= 0
    $: activeBoards = $boardList.boards.findIndex((board)=>board.status !== "archived") >= 0

    const selectBoard = (hash: EntryHashB64) => {
        store.boardList.setActiveBoard(hash)
    }

    let fileinput;
	const onFileSelected = (e)=>{
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.addEventListener("load", async () => {
            const b = JSON.parse(reader.result as string)
            const board = await store.boardList.makeBoard(b)
            selectBoard(board.hashB64())
        }, false);
        reader.readAsText(file);
    };
    const unarchiveBoard = (hash: EntryHashB64) => () => {
        store.boardList.unarchiveBoard(hash)
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

    const getCardGroup = (cardId: uuidv1) : string => {
        const [gId, cId] = Object.entries($state.grouping).find(([gId, cId])=>cId==cardId)
        const g = ($state.groups.find((g)=>g.id == gId))
        if (g) {
            return g.name
        }
        return "Archived"
    }
    let searchInput
    let showSearchResults = false

</script>

<div class="board-menu">
<input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
<div class="nav-button" on:click={()=>newBoardDialog.open()} style="margin-left:10px" title="New Board"><Fa icon={faSquarePlus} size=2x /></div>
<div class="nav-button" on:click={()=>{fileinput.click();}} title="Import Board"><Fa icon={faFileImport} size=2x/></div>
{#if activeBoards}
<sl-select
    placeholder="Select Board"
    on:sl-change={(e)=>{selectBoard(e.target.value)}}
>
    {#each $boardList.boards as board }
        {#if board.status !== "archived" }
            <sl-option value={board.hash}>{board.name}</sl-option>
        {/if}
    {/each}
</sl-select>
{/if}
{#if archivedBoards}
<Menu>
    <div slot="activator">
        <sl-button style="margin-left:10px" title="Archived Boards">
            <Fa icon={faArchive}></Fa>
            <Fa icon={faChevronDown}></Fa>
        </sl-button>
    </div>
    <List>
        {#each $boardList.boards as board }
            {#if board.status === "archived" }
                <ListItem dense={true} on:click={unarchiveBoard(board.hash)}>{board.name}</ListItem>
            {/if}
        {/each}
    </List>
</Menu>
{/if}
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
                    <span>{found.title} in {getCardGroup(found.card)}</span>
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

<NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>

</div>
<style>
  .board-menu {
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