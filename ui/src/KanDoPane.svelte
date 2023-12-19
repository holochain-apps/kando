<script lang="ts">
  import { getContext, onMount } from "svelte";
  import CardEditor from "./CardEditor.svelte";
  import CardDetails from "./CardDetails.svelte";
  import EmojiIcon from "./EmojiIcon.svelte";
  //import { sortBy } from "lodash/fp";
  import type { KanDoStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import { v1 as uuidv1 } from "uuid";
  import { type Card, Group, UngroupedId, type CardProps, type Comment, type Checklists, Board } from "./board";
  import EditBoardDialog from "./EditBoardDialog.svelte";
  import Avatar from "./Avatar.svelte";
  import { decodeHashFromBase64 } from "@holochain/client";
  import { cloneDeep, isEqual } from "lodash";
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import ClickEdit from "./ClickEdit.svelte";
  import { onVisible } from "./util";
  import SvgIcon from "./SvgIcon.svelte";
  import { exportBoard } from "./export";

  onMount(async () => {
        onVisible(columnNameElem,()=>{
          columnNameElem.focus()
          columnNameElem.select()
        })
	});

  Marked.setOptions
  ({
    renderer: new Renderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false
  });

  $: filterOption = null;

  function setFilterOption(newOption) {
    filterOption = newOption;
  }

  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();

  export let activeBoard: Board

  $: uiProps = store.uiProps
  $: participants = activeBoard.participants()
  $: activeCard = store.boardList.activeCard;
  $: activeHashB64 = store.boardList.activeBoardHashB64;
  $: state = activeBoard.readableState()
  $: items = $state ? $state.cards : undefined;
  $: sortCards = (items) => items // no sort algorithm for now
  
  $: openCard = (cardId) => {
    if (cardId) {
      if (cardDetailsDialog) cardDetailsDialog.open(cardId)
    } else {
      if (cardDetailsDialog) cardDetailsDialog.reset()
    }
    return cardId
  }


  $: cardDetailsId = openCard($activeCard)

  let creatingInColumn: uuidv1 | undefined = undefined;
  let createCardDialog
  let editCardDialog
  let cardDetailsDialog
  let editingCardId: uuidv1

  let columns:{ [key:string]: Group } = {}
  let cardsMap:{ [key:string]:Card } ={}
  $: unused = groupCards(items);

  const groupCards = (items) => {
    if ($state) {
      columns = {}
      $state.groups.forEach(g => columns[g.id] = cloneDeep(g))
      cardsMap = {} 
      items.forEach(c => cardsMap[c.id] = cloneDeep(c))
    }
  }

  let prevHash = ""

  // this is a way to get the add column to show up if there are 
  // no groups (besides the archive group)
  $: hashChanged = (hash) => {
    if (hash != prevHash) {
      prevHash = hash
      if ($state.groups.length == 1) {
        addingColumn = true
        if (columnNameElem) {
          columnNameElem.value=""; 
        }
      } else {
        addingColumn = false
      }
    }

  }
  $: x = hashChanged($activeHashB64)

  const sorted = (itemIds, sortFn)=> {
    var items = itemIds.map((id)=>cardsMap[id])
    // if (sortOption) {
    //   items = sortFn(items) 
    // }
    return items
  }

  const newCard = (group: uuidv1) => () => {
      creatingInColumn = group;
      createCardDialog.open()
  };
  
  const createCard = (_groupId: uuidv1, props:any) => {
    addCard(creatingInColumn, props)
    creatingInColumn = undefined
  }

  const clearEdit = () => {
    editingCardId = undefined;
  };

  const cancelEdit = () => {
    creatingInColumn = undefined;
    clearEdit();
  }
  
  const editCard = (id: uuidv1, props:Object) => () => {
    editingCardId = id;
    editCardDialog.edit(id, props)
  };

  const cardDetails = (id: uuidv1) => {

    store.boardList.setActiveCard(id)
    //cardDetailsDialog.open(id)
  };

  const addCard = (column: uuidv1, props: CardProps) => {
      if (column === undefined) {column = 0}
      const card:Card = {
        id: uuidv1(),
        comments: {},
        checklists: {}, 
        props,
      };
      activeBoard.requestChanges([{ type: "add-card", value: card, group: column}]);
  };

  const addComment = (id: uuidv1, text: string) => {
    const comment:Comment = {
      id: uuidv1(),
      text,
      agent: store.myAgentPubKeyB64,
      timestamp: new Date().getTime()
    }

    activeBoard.requestChanges([{ type: "add-card-comment", id, comment}]);
  }
  const updateComment = (id: uuidv1, commentId:uuidv1, text: string) => {
    activeBoard.requestChanges([{ type: "update-card-comment", id, commentId, text}]);
  }
  const deleteComment = (id: uuidv1, commentId:uuidv1) => {
    activeBoard.requestChanges([{ type: "delete-card-comment", id, commentId}]);
  }

  const updateCard = (_groupId: uuidv1, props:CardProps) => {
      const card = items.find((card) => card.id === editingCardId);
      if (!card) {
        console.error("Failed to find item with id", editingCardId);
      } else {
        let changes = []
        if (!isEqual(card.props, props)) {
          changes.push({ type: "update-card-props", id: card.id, props: cloneDeep(props)})
        }
        if (changes.length > 0) {
        activeBoard.requestChanges(changes);
        }
      }
      clearEdit()
  };
    
  const deleteCard = (id: uuidv1) => {
      activeBoard.requestChanges([{ type: "delete-card", id }]);
      clearEdit()
    };

  const countLabels = (props, type) : number | undefined => {
    if (typeof props.labels === 'undefined') {
      return undefined
    }
    return props.labels.includes(type) ? 1 : 0
  };

  const closeBoard = () => {
    store.boardList.closeActiveBoard(false);
    store.setUIprops({showMenu:true})
  };

  const leaveBoard = () => {
    store.boardList.closeActiveBoard(true);
    store.setUIprops({showMenu:true})
  };


  let editBoardDialog
  let dragOn = true
  let draggingHandled = true
  let draggedItemId = ""
  let dragWithSelf = false
  let dragTarget = ""
  let dragOrder : undefined|number = undefined
  function handleDragStart(e) {
    draggingHandled = false
    //console.log("handleDragStart", e)
    e.dataTransfer.dropEffect = "move";
//    e.dataTransfer.setDragImage(e.target)
    draggedItemId = e.target.getAttribute('id')
    e.dataTransfer
      .setData("text", e.target.getAttribute('id'));
  }

  function handleDragEnd(e) {
    clearDrag()
    //console.log("handleDragEnd",e )
  }
  const findColumnElement = (element: HTMLElement):HTMLElement => {
    while (element && !element.classList.contains("column")) {
      element = element.parentElement
    }
    return element
  }
  function handleDragEnter(e) {
   const column = findColumnElement(e.target as HTMLElement)
   //console.log("handleDragEnter", column )
   dragTarget = column ? column.id : ""
  }
  function handleDragLeave(e) {
    const target = e.target as HTMLElement
    //console.log("handleDragLeave", target )

    if (target.id == dragTarget) {
      dragTarget = ""
      dragOrder = undefined
    }
  }
  function handleDragOver(e) {
    e.preventDefault()
    const target = e.target as HTMLElement
    const column = findColumnElement(target)
    const cardsInColumn = $state.grouping[column.id]
    dragOrder = 0
    dragWithSelf = false
    for (const cardId of cardsInColumn) {
      const rect = document.getElementById(cardId).getBoundingClientRect()
      // if we are over ourself ingore!
      if (cardId == draggedItemId) {
        dragWithSelf = true
      }
      if (e.y < rect.y+rect.height/2) {
        break
      }
      dragOrder += 1
    }
  }
  function handleDragDropColumn(e:DragEvent) {
    e.preventDefault();
    if (draggingHandled) {
      return
    }
    const column = findColumnElement(e.target as HTMLElement)
    var srcId = e.dataTransfer.getData("text");
    if (column.id) {
      if (dragWithSelf) {
        dragOrder-=1
      }
      activeBoard.requestChanges([{ type: "update-card-group", id:srcId, group:column.id, index: dragOrder }])
    }
    clearDrag()
    //console.log("handleDragDropColumn",e, column )
  }
  const clearDrag = () => {
    draggingHandled = true
    draggedItemId = ""
    dragTarget = ""
    dragOrder = undefined
    dragWithSelf = false
  }

  const isLabeled = (props, type: string) :boolean => {
    return (props.labels!== undefined) && props.labels.includes(type)
  }

  $: sortedColumns = () => {
    if ($uiProps.showArchived[$activeHashB64]) {
      // make sure the ungrouped group is at the end.
      let cols = $state.groups.map((group)=> [group.id, $state.grouping[group.id]])
      const idx = cols.findIndex(([id,_]) => id == UngroupedId)
      const g = cols.splice(idx,1)
      return cols.concat(g)
    } else {
     return $state.groups.filter(g=> g.id != UngroupedId).map((group)=> [group.id, $state.grouping[group.id]])
    }
  }

  let commentText
  let commenting= ""
  let commentingCardId = ""
  let commentDialog 
  const newComment = (cardId:uuidv1)=> {
    commentingCardId = cardId
    commentDialog.label="New Comment"
    commentText.value = ""
    commenting="new"
    commentDialog.show()
  }
  const editComment = (cardId:uuidv1, comment: Comment) => {
    commentingCardId=cardId
    commentDialog.label="Edit Comment"
    commenting=comment.id
    commentText.value = comment.text
    commentDialog.show()
  }

  $: addingColumn = false
  $: xx = 0
  let newColumnName = ""
  let columnNameElem 


  const newGroup = ()=>{
    if (newColumnName == "") {
      return
    }
    const newGroups = cloneDeep($state.groups)
    newGroups.push(new Group(newColumnName))
    newColumnName = ""
    columnNameElem.value=""
    activeBoard.requestChanges([
      {
        type: "set-groups",
        groups: newGroups
      }
    ])          
  }

  const close = ()=> {
    store.boardList.setActiveCard(undefined)
  }

  const cardColor = (props) => {
    if (props && props.category) {
      const def = $state.categoryDefs.find(c=>c.type == props.category)
      if (def) return def.color
    }
    return "white"
  }

  const checkedChecklistItems = (checklists: Checklists) : number => {
    let result = 0
    for (const [id,list] of Object.entries(checklists)) {
      for (const item of list.items) {
        result += item.checked ? 1 : 0
      }
    }
    return result
  }
  const totalChecklistItems = (checklists: Checklists) : number => {
    let result = 0
    for (const [id,list] of Object.entries(checklists)) {
      result += list.items.length
    }
    return result    
  }

  const doFocus = (node) => {
    // otherwise we get an error from the shoelace element
    setTimeout(() => {
      node.focus()
    }, 50);
  }


</script>
<div class="board">
    <EditBoardDialog bind:this={editBoardDialog}></EditBoardDialog>
  <div class="top-bar">
    <div class="left-items">
      <sl-button  class="board-button close" on:click={closeBoard} title="Close">
        <SvgIcon icon=faClose />
      </sl-button>
      <sl-dropdown class="board-options board-menu" skidding=15>
        <sl-button slot="trigger"   class="board-button settings" caret>{$state.name}</sl-button>
        <sl-menu>
          <sl-menu-item on:click={()=>{participantsDialog.open()}} class="participants">
                <SvgIcon icon=faUserGroup /> <span>Participants</span>
          </sl-menu-item>
          <sl-menu-item on:click={()=> editBoardDialog.open(cloneDeep(activeBoard.hash))} class="board-settings" >
              <SvgIcon icon=faCog  style="background: transparent;"/> <span>Settings</span>
          </sl-menu-item>
          <sl-menu-item on:click={() => exportBoard($state)} title="Export" class="board-export" >
            <SvgIcon icon=faFileExport /> <span>Export</span>
          </sl-menu-item>
          <sl-menu-item on:click={() => {
            store.boardList.archiveBoard(activeBoard.hash)
            store.setUIprops({showMenu: true})
            }} title="Archive" class="board-archive" >
            <SvgIcon icon=faArchive /> <span>Archive</span>
          </sl-menu-item>
          <sl-menu-item  on:click={leaveBoard} class="leave-board" >
              <SvgIcon icon=faArrowTurnDown /> <span>Leave board</span>
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    </div>
    <div class="filter-by">
      <LabelSelector setOption={setFilterOption} option={filterOption} />
    </div>
    <div class="right-items">
      {#if $participants}
        <div class="participants">
          <div style="display:flex; flex-direction: row">
            <Avatar agentPubKey={store.myAgentPubKey} showNickname={false} size={30} />

            {#each Array.from($participants.entries()) as [agentPubKey, sessionData]}
            <div class:idle={Date.now()-sessionData.lastSeen >30000}>
              <Avatar agentPubKey={agentPubKey} showNickname={false} size={30} />
            </div>
            {/each}

          </div>
        </div>
      {/if}

    </div>
  </div>
  {#if $state}
  <CardEditor
    bind:this={createCardDialog}              
    title="New Card"
    handleSave={createCard} {cancelEdit} labelTypes={$state.labelDefs} categories={$state.categoryDefs} />
  <CardEditor
    bind:this={editCardDialog}
    title="Details"
    handleSave={updateCard}
    handleDelete={deleteCard}
    handleArchive={() => {
      activeBoard.requestChanges([{ type: "update-card-group", id:editingCardId, group:UngroupedId, index:0  }])
      clearEdit()
    }}
    {cancelEdit}
    labelTypes={$state.labelDefs}
    categories={$state.categoryDefs}
  />
  <CardDetails
    bind:this={cardDetailsDialog}
  />

    <div class="columns" on:click={(e)=>{close()}}>
      {#each sortedColumns() as [columnId, cardIds], i}
        <div class="column-wrap">
        <div class="column"
          class:glowing={dragTarget == columnId}
          class:first-column={i==0}
          id={columnId}
          on:dragenter={handleDragEnter} 
          on:dragleave={handleDragLeave}  
          on:drop={handleDragDropColumn}
          on:dragover={handleDragOver}
          >
          <div class="column-item column-title">
            <div style="width:100%">
            {#if columnId === UngroupedId}
              Archived
            {:else}
            <ClickEdit
              text={columns[columnId].name} 
              handleSave={(text)=>{
                const newGroups = cloneDeep($state.groups)
                const idx = newGroups.findIndex(g=>g.id==columnId)
                if (idx >= 0) {
                  newGroups[idx].name = text
                  activeBoard.requestChanges([
                    {
                      type: "set-groups",
                      groups: newGroups
                    }
                  ])
                }
              }}></ClickEdit>
            {/if}
            </div>
          </div>

          <sl-dialog bind:this={commentDialog}>
            <sl-textarea bind:this={commentText}></sl-textarea>
            <div style="display:flex;justify-content:flex-end;margin-top:5px;">
              <sl-button style="padding: 0 5px;" size="small"  text on:click={()=> {
                commentDialog.hide()
              }}>
                  Cancel
              </sl-button>
              <sl-button style="padding: 0 5px;" size="small" variant="primary" text on:click={()=> {
                if (commenting=="new")
                  addComment(commentingCardId, commentText.value)
                else {
                  updateComment(commentingCardId, commenting, commentText.value)
                }
                commentDialog.hide()
              }}>
                  Save
              </sl-button>
            </div>
          </sl-dialog>

          <div class="cards">
          {#each sorted($state.grouping[columnId], sortCards) as { id:cardId, comments, props, checklists }, i}
            {#if !filterOption || (props.labels.includes(filterOption))}
                {#if 
                  dragTarget == columnId && 
                  cardId!=draggedItemId && 
                  dragOrder == i && 
                  (!dragWithSelf || $state.grouping[columnId][dragOrder-1] != draggedItemId) }
                 <div> <SvgIcon icon=faArrowRight /> </div>
                {/if}
                <div 
                  class="card"
                  class:tilted={draggedItemId == cardId}
                  class:first-card={i==0}
                  id={cardId}
                  draggable={dragOn}
                  on:dragstart={handleDragStart}
                  on:dragend={handleDragEnd}
                  on:click={(e)=>{e.stopPropagation(); cardDetails(cardId)}}
      
                  style:background-color={cardColor(props)}
                  >
                  <div class="card-content"
                    on:click={(e)=>{e.stopPropagation(); cardDetails(cardId)}}
                  >
                    {#if props.labels.length > 0}
                    <div class="labels">
                      {#each $state.labelDefs as {type, emoji, toolTip}}
                        {#if isLabeled(props, type)}
                          <div title={toolTip}>
                          <EmojiIcon emoji={emoji} class="label-icon"/>
                          </div>
                        {/if}
                      {/each}
                    </div>
                    {/if}
                    <div class="card-edit" style="display:flex;justify-content:space-between">
                      <div class="card-title">{props.title}</div>
                      <div class="board-button">
                        <SvgIcon icon=faEdit size=12px/>
                      </div>

                    </div>
                    <div class="card-description">{@html Marked.parse(props.description)}</div>
                  </div>
                  {#if (props && props.agents && props.agents.length > 0) || ( comments && Object.keys(comments).length>0) || (checklists && Object.keys(checklists).length> 0)}
                  <div class="contributors">
                    {#if props && props.agents && props.agents.length > 0}
                      {#each props.agents as agent}
                        <Avatar size={20}  agentPubKey={decodeHashFromBase64(agent)}/>
                      {/each}
                    {/if}
                    <div class="comments-checklist">
                      {#if checklists && Object.keys(checklists).length>0}
                        <div class="checklist-count"><SvgIcon color="rgba(86, 94, 109, 1.0)" size=11px icon=faCheck /> {checkedChecklistItems(checklists)} / {totalChecklistItems(checklists)}</div>
                      {/if}
                      {#if comments && Object.keys(comments).length>0}
                        <div class="comment-count"><SvgIcon icon=faComments />: {Object.keys(comments).length}</div>
                      {/if}
                    </div>
                  </div>
                  {/if}
                </div>
            {/if}
          {/each}
          {#if dragTarget == columnId && dragOrder == $state.grouping[columnId].length}
            <div> <SvgIcon icon=faArrowRight />  </div>
          {/if}
              <div class="add-card" on:click={newCard(columnId)}><span class="add-icon">+</span><span>Add Card</span></div>
          </div>
        </div>
        </div>
      {/each}
        <div  class:hidden={addingColumn} class="column-wrap">
          <div class="column">
            <div class="add-column column-item"
              on:click={()=>{newColumnName = ""; xx+=1; addingColumn = true;columnNameElem.value=""; }}
            >Add Column +</div>
          </div>
        </div>
        <div class:hidden={!addingColumn} class="column-wrap">
          <div class="column">
            <div class="add-column editing-column-name"
              on:click={()=>{{addingColumn = true; console.log("FISH2", addingColumn)}}}
            >
              <sl-input class="column-name-input"
                use:doFocus
                bind:this={columnNameElem} 
                placeholder="column name" 
                on:keydown={(e)=> {
                  if (e.keyCode == 27) {
                    newColumnName = ""
                    addingColumn=false
                  }
                }}
                on:sl-input={e=>newColumnName = e.target.value} 
                on:sl-blur={()=>{addingColumn=false}}
                on:sl-change={()=>{newGroup()}}
                >
              </sl-input>
              <sl-button class="new-column-button board-button" disabled={newColumnName.length==0} style="padding: 0 5px;" size="small" text 
                on:mousedown={()=>{
                  addingColumn = false  // sl-change will cause newGroup to be callsed
              }}>
                <div style="display: flex;">
                  <div class="new-column-icon"><SvgIcon icon=faPlus style="font-size: 18px;"/></div>
                </div>
              </sl-button>
            </div>
          </div>
        </div>
      </div>
  {/if}
  <div class="bottom-fade"></div>
</div>
<style>
  .board {
    display: flex;
    flex-direction: column;
    background: transparent;
    border-radius: 0;
    min-height: 0;
    overflow-x: auto;
    width: 100%;
    position: relative;
    max-height: calc(100vh - 50px);
  }
  .top-bar {
    box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    background-color: #fff;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 0;
    position: sticky;
    width: 100%;
    top: 0;
    left: 0;
    z-index: 200;
    color: white
  }
  .left-items {
    display: flex;
    align-items: center;
  }
  .board-name {
    font-size: 24px;
    padding-left: 5px;
  }
  .right-items {
    display: flex;
    align-items: center;
  }

  sl-button.board-button::part(base) {
    background-color: transparent;
  }

  .board-button.close {
    margin-left: 0;
    margin-right: 5px;
  }

  .board-button.close::part(base) {
    font-size: 20px;
    line-height: 36px;
  }

  .right-items .board-button::part(base) {
    font-size: 24px;
  }
  
  .board-button {
    margin-left: 10px;
  }

  .board-button.settings {
    width: auto;
    margin-left: 0;
  }
  .board-options .board-settings {
    width: 100%;
  }
  .board-options .board-settings span, .board-export span, .board-archive span, .board-options .leave-board span, .board-options .participants span {
    font-size: 16px;
    font-weight: bold;
  }

  .board-button.settings:hover {
    transform: scale(1.1);
  }

  .board-button.settings::part(base) {
    width: auto;
    font-size: 18px;
    font-weight: bold;
    color: rgba(86, 92, 108, 1.0);
  }

  .board-button.settings::part(label) {
    padding: 0 0 0 0;
    height: 36px;
    line-height: 36px;
  }

  .board-button.settings:hover {
    opacity: 1;
  }

  .board-button::part(base) {
    border: none;
    padding: 0;
    margin: 0;
  }
  
  .board-button {
    width: 30px;
    height: 30px;
    background: #FFFFFF;
    border: 1px solid rgba(35, 32, 74, 0.1);
    box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
    border-radius: 5px;
    padding: 5px 10px;
    display: flex;
    transform: scale(1);
    align-items: center;
    justify-content: center;
    transition: all .25s ease;
  }
  
  .board-button:hover {
    transform: scale(1.25);
  }

  .board-button:active {
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
    transform: scale(1.1);
  }

  .card-edit {
    position: relative;
    z-index: 1;
  }

  .card-edit .board-button:hover {

  }
  .card-edit .board-button:active {
    padding: 5px 10px;
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
  }

  .filter-by {
    display: flex;
    align-items: center;
    margin-right: 8px;
    height: 47px;
    padding-right: 10px;
  }

  .bottom-fade {
    position: fixed;
    bottom: 0;
    z-index: 100;
    width: 100%;
    height: 20px;
    bottom: 10px;
    background: linear-gradient(180deg, rgba(189, 209, 230, 0) 0%, rgba(102, 138, 174, 0.81) 100%);
    opacity: 0.4;
  }
 
  .columns {
    display: flex;
    flex: 0 1 auto;
    max-height: 100%;
    background: transparent;
    min-height: 0;
    padding: 0 15px 0 15px;
    position: relative;
    z-index: 1;
  }

  .column-item {
    padding: 10px 10px 0px 10px;
    display: flex;
    align-items: center;
    flex: 0 1 auto;
  }

  .column-title, .add-column {
    font-weight: bold;
    font-size: 16px;
    padding: 10px;
    border-radius: 0 0 5px 5px;
    position: sticky;
    z-index: 0;
    top: 0;
    background-color: #fff;
    box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.15);
    z-index: 150;
    transition: all .25s ease;
  }
  .add-column {
    opacity: .7;
    transition: all .25s ease;
  }

  .editing-column-name.add-column {
    display: flex;
    flex-direction: row;
  }

  .new-column-button {
    width: 40px;
    transform: scale(1);
    transition: all .25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    top: -2px;
  }

  .new-column-button:hover {
    transform: scale(1.25);
    cursor: pointer;
  }
  
  .new-column-button:active {
    transform: sclae(1.1);
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
  }

  .new-column-button::part(base) {
    border: none;
  }

  .new-column-icon {
    position: relative;
    top: 3px;
  }
  .column-title:hover, .add-column:hover {
    box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.3);
    padding: 15px;
    margin: 0 -5px;
    opacity: 1;
    cursor: pointer;
  }

  .column-name-input {
    width: 230px;
  }

  .column-title:hover {
    cursor: pointer;
    margin: 0 -5px -10px -5px;
  }

  .column-footer {
    border-top: 1px solid #999;
    padding: 0 5px;
    min-height: 38px;
  }
  .column-wrap {
    display: flex;
    flex-direction: column;
  }
  .column {
    margin-right: 10px;
    display: flex;
    flex-direction: column;
    width: 300px;
    margin-left: 10px;
    border-radius: 3px;
    min-width: 130px;
    min-height: 0;
    max-height: calc(100vh - 100px);
    overflow: visible;
  }
  .first-column {
    margin-left: 0px !important;
  }
  .cards {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    width: calc(100% + 8px);
    height: calc(100vh - 150px);
    margin-top: 0;
    padding-top: 10px;
    padding-bottom: 20px;
  }
  .cards::-webkit-scrollbar {
    width: 5px;
    background-color: transparent;
  }

  .cards::-webkit-scrollbar-thumb {
      height: 5px;
      border-radius: 5px;
      background: rgba(20,60,119,.3);
      opacity: 1;
  }

  .board::-webkit-scrollbar {
    height: 10px;
    background-color: transparent;
  }

  .board::-webkit-scrollbar-thumb {
    border-radius: 0 0 0 0;
    background: rgba(20,60,119,.7);
    /* background: linear-gradient(180deg, rgba(20, 60, 119, 0) 0%, rgba(20,60,119,.6) 100%); */
  }

  .glowing {
    outline: none;
    border-color: #9ecaed;
    box-shadow: 0 0 10px #9ecaed !important;
  }
  .tilted {
    transform: rotate(3deg);
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.5) !important;
  }

  .card, .add-card {
    background-color: white;
    margin: 0px 10px 10px 10px;
    box-shadow: 0px 4px 4px rgba(35, 32, 74, 0.15);
    font-size: 12px;
    line-height: 16px;
    color: #23204A;
    border-radius: 5px;
    display:flex;
    flex-direction:column;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
  }

  .card:hover .board-button {
    opacity: 1;
  }

  .card:hover, .add-card:hover {
    cursor: pointer;
    box-shadow: 0px 8px 10px rgba(35, 32, 74, 0.25);
    padding: 20px;
    margin: -5px 0px -5px 0px;
    position: relative;
    z-index: 100;

    /* uncomment to see this example of card growing dramatically */
    /* height: calc(100vh - 125px);
    max-height: calc(100vh - 125px); */
  }

  .card:active, .add-card:active {
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
    padding: 15px;
    margin: 0px 5px 0px 5px;
  }

  .add-card {
    display: flex;
    flex-direction: row;
    font-size: 14px;
    opacity: .7;
  }

  .add-card:hover {
    opacity: 1;
  }

  .add-icon {
    font-size: 24px;
    opacity: .6;
    font-weight: bold;
    margin-right: 5px;
  }

  .card-edit .board-button {
    padding: 10px 15px;
    opacity: 0;
    transition: all .25s ease;
  }

  .card:hover .card-edit .board-button {
    opacity: 1;
  }
  .card-content {
    padding: 0 5px;
  }

  .card-title {
    font-size: 16px;
    font-weight: bold;
  }

  .card-description {
    font-size: 14px;
    opacity: .8;
    line-height: 18px;
    padding-top: 3px;
    -webkit-line-clamp: 3;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    position: relative;
    z-index: 0;
  }

  .contributors {
    padding-top: 15px;
    padding-left: 8px;
    padding-right: 10px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .comments-checklist {
    display: flex;
    position: relative;
    top: 3px;
  }
  
  .comment-count {
    margin-left: 15px;
  }

  .labels {
    display: block;
    padding-bottom: 10px;
  }
  
  .labels div {
    display: inline-flex;
    width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    margin-right: 10px;
    border: 1px solid rgba(235, 235, 238, 1.0);
    background-color: rgba(255,255,255,.8);
  }

  .label-icon {
    margin-right: 0;
  }

  .hidden {
    display: none;
  }
</style>
