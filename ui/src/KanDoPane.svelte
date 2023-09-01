<script lang="ts">
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import CardEditor from "./CardEditor.svelte";
  import CardDetails from "./CardDetails.svelte";
  import EmojiIcon from "./icons/EmojiIcon.svelte";
  //import { sortBy } from "lodash/fp";
  import type { KanDoStore } from "./kanDoStore";
  import LabelSelector from "./LabelSelector.svelte";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import { v1 as uuidv1 } from "uuid";
  import { type Card, Group, UngroupedId, type CardProps, type BoardState, type Comment } from "./board";
  import EditBoardDialog from "./EditBoardDialog.svelte";
  import AvatarIcon from "./AvatarIcon.svelte";
  import { decodeHashFromBase64 } from "@holochain/client";
  import { cloneDeep, isEqual } from "lodash";
  import sanitize from "sanitize-filename";
  import Fa from "svelte-fa";
  import { faArrowRight, faClose, faCog, faComments, faEdit, faFileExport, faPlus } from "@fortawesome/free-solid-svg-icons";
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import ClickEdit from "./ClickEdit.svelte";
  import { onVisible } from "./util";

  onMount(async () => {
        onVisible(columnNameElem,()=>{
          columnNameElem.focus()
          columnNameElem.select()
        })
	});

  const download = (filename: string, text: string) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  const exportBoard = (state: BoardState) => {
        const prefix = "kando"
        const fileName = sanitize(`${prefix}_export_${state.name}.json`)
        download(fileName, JSON.stringify(state))
        alert(`Your board was exported to your Downloads folder as: '${fileName}'`)
    }

  const dispatch = createEventDispatcher()

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

  const { getStore } :any = getContext("kdStore");
  let kdStore: KanDoStore = getStore();

  $: uiProps = kdStore.uiProps
  $: activeHash = kdStore.boardList.activeBoardHash;
  $: activeCard = kdStore.boardList.activeCard;
  $: state = kdStore.boardList.getReadableBoardState($activeHash);
  $: items = $state ? $state.cards : undefined;
  $: sortCards = (items) => items // no sort algorithm for now

  $: avatars = kdStore.boardList.avatars()
  
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

  // this is a way to get the add column to show up if there are 
  // no groups (besides the archive group)
  // TODO figure out to to get it to focus
  $: hashChanged = (_hash) => {
    addingColumn = $state.groups.length == 1
  }
  $: x = hashChanged($activeHash)

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

    kdStore.boardList.setActiveCard(id)
    //cardDetailsDialog.open(id)
  };

  const addCard = (column: uuidv1, props: CardProps) => {
      if (column === undefined) {column = 0}
      const card:Card = {
        id: uuidv1(),
        comments: [],
        props,
      };
      dispatch("requestChange", [{ type: "add-card", value: card, group: column}]);
  };

  const addComment = (id: uuidv1, text: string) => {
    const comment:Comment = {
      id: uuidv1(),
      text,
      agent: kdStore.myAgentPubKey(),
      timestamp: new Date().getTime()
    }

    dispatch("requestChange", [{ type: "add-card-comment", id, comment}]);
  }
  const updateComment = (id: uuidv1, commentId:uuidv1, text: string) => {
    dispatch("requestChange", [{ type: "update-card-comment", id, commentId, text}]);
  }
  const deleteComment = (id: uuidv1, commentId:uuidv1) => {
    dispatch("requestChange", [{ type: "delete-card-comment", id, commentId}]);
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
        dispatch("requestChange", changes);
        }
      }
      clearEdit()
  };
    
  const deleteCard = (id: uuidv1) => {
        dispatch("requestChange", [{ type: "delete-card", id }]);
        clearEdit()
    };

  const countLabels = (props, type) : number | undefined => {
    if (typeof props.labels === 'undefined') {
      return undefined
    }
    return props.labels.includes(type) ? 1 : 0
  };

  const closeBoard = () => {
    kdStore.boardList.closeActiveBoard();
    kdStore.setUIprops({showMenu:true})
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
      dispatch("requestChange",[{ type: "update-card-group", id:srcId, group:column.id, index: dragOrder }])
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
    if ($uiProps.showArchived[$activeHash]) {
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
  let newColumnName = ""
  let columnNameElem 

</script>
<div class="board">
    <EditBoardDialog bind:this={editBoardDialog}></EditBoardDialog>
  <div class="top-bar">
    <div class="left-items">
      <h5>{$state.name}</h5>
    </div>
    <div class="right-items">
      <div class="filter-by">
        Filter by: <LabelSelector setOption={setFilterOption} option={filterOption} />
      </div>

      <sl-button circle on:click={()=> editBoardDialog.open(cloneDeep($activeHash))} title="Settings">
        <Fa icon={faCog} size="1x"/>
      </sl-button>
      <sl-button circle on:click={() => exportBoard($state)} title="Export">
        <Fa icon={faFileExport} />
      </sl-button>
      <sl-button circle on:click={closeBoard} title="Close">
        <Fa icon={faClose} />
      </sl-button>
    </div>
  </div>
  {#if $state}
  <CardEditor
    bind:this={createCardDialog}              
    title="New Card"
    handleSave={createCard} {cancelEdit} avatars={avatars} labelTypes={$state.labelDefs} categories={$state.categoryDefs} />
  <CardEditor
    bind:this={editCardDialog}
    title="Details"
    handleSave={updateCard}
    handleDelete={deleteCard}
    handleArchive={() => {
        dispatch("requestChange",[{ type: "update-card-group", id:editingCardId, group:UngroupedId  }])
        clearEdit()
    }}
    {cancelEdit}
    avatars={avatars}
    labelTypes={$state.labelDefs}
    categories={$state.categoryDefs}
  />
  <CardDetails
    bind:this={cardDetailsDialog}
    avatars={avatars}
  />

    <div class="columns">
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
                  kdStore.boardList.requestBoardChanges($activeHash, [
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
          {#each sorted($state.grouping[columnId], sortCards) as { id:cardId, comments, props }, i}
            {#if !filterOption || (props.labels.includes(filterOption))}
                {#if 
                  dragTarget == columnId && 
                  cardId!=draggedItemId && 
                  dragOrder == i && 
                  (!dragWithSelf || $state.grouping[columnId][dragOrder-1] != draggedItemId) }
                 <div> <Fa icon={faArrowRight} /> </div>
                {/if}
                <div 
                  class="card"
                  class:tilted={draggedItemId == cardId}
                  class:first-card={i==0}
                  id={cardId}
                  draggable={dragOn}
                  on:dragstart={handleDragStart}
                  on:dragend={handleDragEnd}
      
                  style:background-color={props && props.category ?  $state.categoryDefs.find(c=>c.type == props.category).color : "white"}
                  >
                  <div class="card-content"
                    on:click={(e)=>{e.stopPropagation(); cardDetails(cardId)}}
                  >
                    <div style="display:flex;justify-content:space-between">
                      <h3>{props.title}</h3>
                      <div class="action-button"
                        on:click={(e)=>{e.stopPropagation(); editCard(cardId,props)()}}
                        >
                        <Fa icon={faEdit}/>
                      </div>

                    </div>
                    {@html Marked.parse(props.description)}
                  </div>
                  <div class="labels">
                    {#each $state.labelDefs as {type, emoji, toolTip}}
                      {#if isLabeled(props, type)}
                        <div title={toolTip}>
                        <EmojiIcon emoji={emoji} class="label-icon"/>
                        </div>
                      {/if}
                    {/each}
                  </div>
                  {#if props && props.agents && props.agents.length > 0}
                    {#each props.agents as agent}
                      <AvatarIcon size={20} avatar={$avatars[agent]} key={decodeHashFromBase64(agent)}/>
                    {/each}
                  {/if}
                  {#if comments.length>0}
                    <div class="comment-count"><Fa icon={faComments} />: {comments.length}</div>
                  {/if}
                  
                </div>
            {/if}
          {/each}
          {#if dragTarget == columnId && dragOrder == $state.grouping[columnId].length}
            <div> <Fa icon={faArrowRight} />  </div>
          {/if}

          </div>
          <div class="column-item column-footer">
            <sl-button style="padding: 0 5px;" size="small" text on:click={newCard(columnId)}>
              <div style="display: flex;">
                Add Card
                <div style="margin-left:5px"><Fa icon={faPlus}/></div>
              </div>
            </sl-button>
          </div>
        </div>
        </div>
      {/each}
        <div class:hidden={addingColumn} class="add-column"
          on:click={()=>{newColumnName = ""; addingColumn = true;columnNameElem.value=""; columnNameElem.focus()}}
        >Add Column +</div>
      <div class="add-column"
        class:hidden={!addingColumn}
        on:click={()=>{addingColumn = true; }}
      >
        <sl-input bind:this={columnNameElem} placeholder="column name"  on:sl-input={e=>newColumnName = e.target.value} on:sl-blur={()=>addingColumn=false}></sl-input>
        <sl-button disabled={newColumnName.length==0} style="padding: 0 5px;" size="small" text on:mousedown={async ()=>{
          const newGroups = cloneDeep($state.groups)
          newGroups.push(new Group(newColumnName))
          newColumnName = ""
          addingColumn = false
          await kdStore.boardList.requestBoardChanges($activeHash, [
            {
              type: "set-groups",
              groups: newGroups
            }
          ])          
        }}>
          <div style="display: flex;">
            New
            <div style="margin-left:5px"><Fa icon={faPlus}/></div>
          </div>
        </sl-button>
      </div>
    </div>
  {/if}
</div>
<style>
  .add-column {
    cursor: pointer;
    display: flex;
    background-color: #eeeeeecc;
    width: 300px;
    margin-top: 10px;
    margin-left: 5px;
    border-radius: 3px;
    min-width: 130px;
    height: 50px;
    padding: 10px;
  }
  .board {
    display: flex;
    flex-direction: column;
    background: transparent;
    border-radius: 0;
    min-height: 0;
    overflow-x: auto;
    width: 100%;
    padding-bottom: 10px;
    position: relative;
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
    z-index: 1;
    color: white
  }
  .left-items {
    display: flex;
    align-items: center;
  }
  .right-items {
    display: flex;
    align-items: center;
  }
  .filter-by {
    border-right: 1px solid lightgray;
    display: flex;
    align-items: center;
    margin-right: 8px;
    height: 47px;
    padding-right: 10px;
  }
 
  .columns {
    display: flex;
    flex: 0 1 auto;
    max-height: 100%;
    background: transparent;
    min-height: 0;
    padding: 0 15px 15px 15px;
  }

  .column-item {
    padding: 10px 10px 0px 10px;
    display: flex;
    align-items: center;
    flex: 0 1 auto;
  }

  .column-title {
    font-weight: bold;
    font-size: 16px;
    padding: 10px;
    border-radius: 0 0 5px 5px;
    position: sticky;
    z-index: 0;
    top: 0;
    background-color: #fff;
    box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.15);
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
    display: flex;
    flex-direction: column;
    width: 300px;
    margin-left: 5px;
    border-radius: 3px;
    min-width: 130px;
    min-height: 0;
    max-height: calc(100vh - 100px);
    overflow: auto;
  }
  .first-column {
    margin-left: 0px !important;
  }
  .cards {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 38px;
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
  .first-card {
    margin-top: 10px !important;
  }
  .card {
    background-color: white;
    margin: 0px 10px 10px 10px;
    padding: 5px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
    font-size: 12px;
    line-height: 16px;
    color: #000000;
    border-radius: 3px;
    display:flex;
    flex-direction:column;
  }
  .card-content {
    overflow-y: auto;
    max-height: 200px;
    padding: 0 5px;
  }
  .labels {
    display: flex;
    align-items: center;
    justify-content: space-around;
    margin-top: 5px;
  }
  
  .action-button {
    cursor: pointer;
    border-radius: 50%;
    padding:2px;
    width:20px;
    display: flex;
    justify-content: center;
  }
  .action-button:hover {
    background-color: rgb(240, 249, 2244);
    border: solid 1px rgb(149, 219, 252);
    color:  rgb(3, 105, 161);
  }
  .hidden {
    display: none;
  }
</style>
