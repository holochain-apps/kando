<script lang="ts">
  import { DEFAULT_PROPS, UngroupedId, UngroupedName, type CardProps, type CategoryDef} from "./board";
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import { cloneDeep, isEqual } from "lodash";
  import { v1 as uuidv1 } from "uuid";
  import { getContext } from 'svelte';
  import type { KanDoStore } from './store';
  import Avatar from './Avatar.svelte';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type { BoardDelta, Card, Checklist, ChecklistItem, Comment } from "./board";

  import { Marked } from "@ts-stack/markdown";
  import SvgIcon from "./SvgIcon.svelte";
  import ClickEdit from './ClickEdit.svelte';
  import AttachmentsList from './AttachmentsList.svelte';
  import AttachmentsDialog from "./AttachmentsDialog.svelte"
  import type { WAL } from '@lightningrodlabs/we-applet';

  
  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();
  $: activeBoard = store.boardList.activeBoard;
  $: state = $activeBoard.readableState()
  $: card = $state.cards.find(c=>c.id == cardId)
  $: props = cloneDeep(card ? card.props : DEFAULT_PROPS)
  $: labelTypes = $state.labelDefs
  $: categories = $state.categoryDefs
  $: labelOptions = labelTypes.map(({type, emoji, toolTip}) => 
    {return {label: `${emoji} ${toolTip}`, value: type}} )
  $: selectedLabels = calcSelectedLabels(props.labels)
  $: selectedAvatars = cloneDeep(props.agents)
  $: allProfiles = store.profilesStore.allProfiles

  export let cardId:uuidv1
  export let showControls = true

  export const updateLatestComment = () => {
    const card =  $state.cards.find(c=>c.id == cardId)
    if (card) {
      const comments = Object.values(card.comments).sort((a,b)=> a.timestamp - b.timestamp)
      const latest = comments[comments.length-1]
      if (latest) {
        store.updateLatestComment($activeBoard.hash, cardId, latest.timestamp)
      }
    }
  }

  let inputElement

  const calcSelectedLabels = (labels:Array<string>) => {
    return labels.filter(l=>labelTypes.findIndex(lt=>lt.type==l) >= 0).map(l=> {
          const idx = labelTypes.findIndex(lt => lt.type==l)
          const {emoji, toolTip} = labelTypes[idx]
          return {label: `${emoji} ${toolTip}`, value: l}
        })
  }

  $: sortedColumns = () => {
      // make sure the archive is at the end.
      let cols = $state.groups
      const idx = cols.findIndex(g => g.id == UngroupedId)
      if (idx >=0)
        cols.splice(idx,1)

      return cols.concat({id:UngroupedId,name:UngroupedName})
  }

  const setColumn = (id:string) => {
    requestChanges([{ type: "update-card-group", id:cardId, group:id, index: 0 }])
  }

  const setCategory = (type) => {
    props.category  = type
    props = props
    handleSave(props)
  }

  const setAgents = () => {
    if (!isEqual(props.agents, selectedAvatars)) {
      props.agents = selectedAvatars
      requestChanges([{ type: "set-card-agents", id: card.id, agents: cloneDeep(props.agents)}]);
    }
  } 

  const setLabels = () => {
    props.labels = selectedLabels.map(o => o.value)
    props = props
  }

  const getCategory = (p) : CategoryDef | undefined => {
    return categories.find(c=>c.type == p.category)
  }

  export const reset = ()=>{
    editingTitle = false
    editingDescription = false
  }

  const close = ()=> {
    store.boardList.setActiveCard(undefined)
    updateLatestComment()
  }

  const handleArchive = () => {
    requestChanges([{ type: "update-card-group", id:cardId, group:UngroupedId  }])
  }

  const handleDelete = (id: uuidv1) => {
    requestChanges([{ type: "delete-card", id }]);
    close()
  };

  const handleSave = (props:CardProps, doClose=false) => {
      if (card) {
        let changes = []
        if (!isEqual(card.props, props)) {
          changes.push({ type: "update-card-props", id: card.id, props: cloneDeep(props)})
        }
        if (changes.length > 0) {
          requestChanges(changes);
        }
      }
      if (doClose) {
        close()
      }
  };
    
  const requestChanges = (changes) => {
    $activeBoard.requestChanges(changes)
  }

  let labelSelect

  let commentText = ""
  let commentTextElem
  let commenting= ""
  let commentingCardId = ""
  let commentDialog 
  const newComment = (cardId:uuidv1)=> {
    commentingCardId = cardId
    commentDialog.label="New Comment"
    commentTextElem.value = ""
    commenting="new"
    commentDialog.show()
  }
  const editComment = (cardId:uuidv1, comment: Comment) => {
    commentingCardId=cardId
    commentDialog.label="Edit Comment"
    commenting=comment.id
    commentTextElem.value = comment.text
    commentDialog.show()
  }
  const addComment = (id: uuidv1, text: string) => {
    const comment:Comment = {
      id: uuidv1(),
      text,
      agent: store.myAgentPubKeyB64,
      timestamp: new Date().getTime()
    }
    requestChanges([{ type: "add-card-comment", id, comment}])
    updateLatestComment()
  }
  const updateComment = (id: uuidv1, commentId:uuidv1, text: string) => {
    requestChanges([{ type: "update-card-comment", id, commentId, text}]);
    updateLatestComment()
  }
  const deleteComment = (id: uuidv1, commentId:uuidv1) => {
    requestChanges([{ type: "delete-card-comment", id, commentId}]);
    updateLatestComment()
  }

  const addChecklist = (id: uuidv1, title: string, order: number) => {
    const checklist:Checklist = {
      id: uuidv1(),
      title,
      items: [],
      order,
      timestamp: new Date().getTime(),
    }
    requestChanges([{ type: "add-card-checklist", id, checklist}])
  }
  const updateChecklist = (id: uuidv1, checklistId:uuidv1, title: string, order:number, items: Array<ChecklistItem>) => {
    requestChanges([{ type: "update-card-checklist", id, checklistId, title, order, items}]);
  }
  const deleteChecklist = (id: uuidv1, checklistId:uuidv1) => {
    requestChanges([{ type: "delete-card-checklist", id, checklistId}]);
  }

  const addChecklistItem = (id: uuidv1, list:Checklist, text: string) => {
    const item = {checked:false, text}
    const changes:BoardDelta[] = [{ type: "add-checklist-item", id, checklistId:list.id, item }]
    requestChanges(changes)
  }

  const setChecklistItemStatus = (id: uuidv1, list:Checklist, idx: number, checked: boolean) => {
    const changes:BoardDelta[] = [{ type: "set-checklist-item-state", id, checklistId:list.id, itemId:idx, state:checked }]
    requestChanges(changes)

  }

  const deleteChecklistItem = (id: uuidv1, list:Checklist, idx: number) => {
    const changes:BoardDelta[] = [{ type: "delete-checklist-item", id, checklistId:list.id, itemId:idx }]
    requestChanges(changes)
  }

  const convertChecklistItem = (id: uuidv1, list:Checklist, idx: number) => {

    const groupId = store.getCardGroupId(cardId, $state)
    const c:Card = {
        id: uuidv1(),
        comments: {},
        checklists: {},
        creator: store.myAgentPubKeyB64,
        props: {
          title: list.items[idx].text,
          description: `(converted to card from checklist ${list.title} in ${card.props.title})`,
          category: "",
          agents: [],
          labels: [],
          attachments: []
        },
      };

    const changes:BoardDelta[] = [{ type: "convert-checklist-item", id, checklistId:list.id, itemId:idx, groupId, card: c }]
    requestChanges(changes)
  }

  const editDescription = () => {
    editingDescription=true; 
    editDesc = `${props.description}`
  }

  const cancelEditDescription = () => {
    editingDescription=false; 
    editDesc = ``
  }
  
  const doFocus = (node) => {
    // otherwise we get an error from the shoelace element
    setTimeout(() => {
      node.focus()
    }, 50);
  }

  let editingTitle = false
  let editingDescription = false
  let editDesc

  let commentingFocused = false
  let commentElement

  let addingChecklist = false
  let checklistTitle = ""
  let checklistElement
  let addingChecklistItem = -1
  let checklistItemElement

  let editDescriptionElement

  let attachmentsDialog : AttachmentsDialog

  const removeAttachment = (idx: number) => {
    props.attachments.splice(idx,1)
    handleSave(props)
  }

  const walToPocket = () => {
    const attachment: WAL = { hrl: [store.dnaHash, $activeBoard.hash], context: cardId }
    store.weaveClient?.walToPocket(attachment)
  }
</script>

{#if store.weaveClient}
  <AttachmentsDialog activeBoard={$activeBoard} bind:this={attachmentsDialog}></AttachmentsDialog>
{/if}

<div class='card-editor'>
  <div class="card-wrapper">
    <div class="card-elements">
      
      {#if categories.length > 0}
      <div style="display:flex; flex-direction:row;align-items:flex-end">
        <div class="category-selector">
        {#each categories as category }
          <div class:category-selected={props.category == category.type} title={category.name} class="category-button" on:click={(e)=>{setCategory(props.category == category.type ? "" : category.type)}} style="background-color: {category.color}"></div>
        {/each}
        </div>
      </div>
      {:else if showControls}
      <div class="top-spacer"></div>
      {/if}

      <div style="display:flex;justify-content:space-between">
        <div class="card-title">
        <ClickEdit
          text={props.title} 
          handleSave={(text)=>{
            props.title = text
            handleSave(props)
          }}></ClickEdit>
        </div>
        {#if showControls}
          <div class="card-controls">
            
            {#if store.weaveClient}
              <div class="details-button pocket-button" title="Add this card to pocket" on:click={()=>walToPocket()}>
                <SvgIcon icon=addToPocket size="25px"/>
              </div>
            {/if}
            {#if handleDelete}
              <div class="details-button delete-button" title="Delete this card" on:click={()=>handleDelete(cardId)}>
                <SvgIcon icon=faTrash size="16px"/>
              </div>
            {/if}
            {#if handleArchive}
              <div class="details-button archive-button" title="Archive this card" on:click={()=>{close();handleArchive()}}>
                <SvgIcon icon=faArchive size="18px"/>
              </div>
            {/if}
            <div class="details-button" title="Close this card" on:click={(e)=>{close()}}>
              <SvgIcon icon=faClose size="18px"/>
            </div>
          </div>
        {/if}
      </div>
      <div class="belongs-to" style="display:flex; align-items: center; justify-content:space-between">
        <div style="display:flex; align-items: center;">
          <span style="margin-right:5px;">In: </span>
          <sl-select style="z-index:10000"
          value={store.getCardGroupId(cardId, $state)}
          size="small"
          on:sl-change={(e)=>{
            setColumn(e.target.value)
          }}
          >
          {#each sortedColumns() as col }
            <sl-option value={col.id}>{col.name}</sl-option>
          {/each}
        </sl-select>
        </div>
        {#if card && card.creator}
          <div style="display:flex; align-items: center;">
            <div style="margin-left:20px;margin-right:5px;">Created by:</div><Avatar size={20}  agentPubKey={decodeHashFromBase64(card.creator)}/>
          </div>
        {/if}
      </div>
      {#if editingDescription}
        <sl-textarea id="edit-desc" use:doFocus bind:this={editDescriptionElement} rows=10 class='textarea' value={editDesc}
          on:sl-input={e=>{
            editDesc = e.target.value
          }}
          on:sl-blur={()=> {
            props.description = editDesc
            handleSave(props)
            editingDescription=false
          }}
          on:keydown={(e)=> {
            if (e.keyCode == 27) {
              editDescriptionElement.blur()
              e.stopPropagation()
            }
        }}


          ></sl-textarea>
      {:else}
          {#if props.description}
            <div style="display:flex;flex-direction: column">
              <div class="details" style="cursor:pointer" on:click={(e)=>editDescription()}>{@html Marked.parse(props.description)}</div>
            </div>
          {:else}
          <div style="display:flex;flex-direction: column">
            <div class="details" style="opacity: .7;cursor:pointer" on:click={(e)=>editDescription()}>Add a description... <SvgIcon icon=faEdit size=12px/></div>
          </div>
          {/if}
      {/if}
      <div class="checklists">
        {#if card && card.checklists && Object.keys(card.checklists).length > 0}
          {#each Object.values(card.checklists).sort((a,b)=>a.order - b.order) as list, idx}
          <div class="checklist">
              <div class="list-title">
                <ClickEdit
                  text={list.title}
                  handleSave={()=>{
            
                  }}
                  handleDelete={()=>{
                    deleteChecklist(cardId,list.id)
                  }}
                >
                </ClickEdit>      
              </div>
            {#each list.items as item, itemIdx}
            <div class="checklist-item">
              <sl-checkbox
                on:sl-change={(e)=>{
                  setChecklistItemStatus(cardId,list,itemIdx,e.target.checked)
                }} 
                checked={item.checked}
                >{item.text}</sl-checkbox>
                <div style="disply:flex;align-items:center;">
                  <span class="convert-item" title="Convert item to card"  on:click={(e)=>{
                    e.stopPropagation();
                    convertChecklistItem(cardId,list,itemIdx)
                  }}><SvgIcon icon=convertCard size=18x style="opacity: .3;  margin-left: 3px; position: relative; top: -.15rem"/></span >
                  <span class="delete-item" title="Delete item" on:click={(e)=>{
                    e.stopPropagation();
                    deleteChecklistItem(cardId,list,itemIdx)
                  }}><SvgIcon icon=faTrash size=12px style="opacity: .3;  margin-left: 3px; position: relative; top: -.15rem"/></span >
                  
                </div>
            </div>
            {/each}
            {#if addingChecklistItem != idx}
              <div class="add-checklist-item" 
                  on:click={()=>{
                    addingChecklistItem=idx}}>
                  
                  <div>
                    <span class="add-item-icon"><SvgIcon icon=faPlus/></span>
                    Add item
                  </div>
              </div>
            {:else}
              <div class="adding-checklist-item">
                <div class="adding-checklist-input-wrapper">
                  <div class="adding-checklist-empty-box"></div>
                  <sl-input bind:this={checklistItemElement} placeholder="New checklist item" class="adding-checklist-input"
                    on:sl-input={(e)=>{
                    }}
                    on:sl-blur={()=>{
                      checklistItemElement.value = ""
                    }}
              
                    on:keydown={(e)=> {
                        if (e.keyCode == 27) {
                          checklistItemElement.value = ""
                          addingChecklistItem = -1
                          e.stopPropagation()
                        }
                        if (e.keyCode == 13) {
                          addChecklistItem(cardId, list, checklistItemElement.value)
                          checklistItemElement.value = ""
                          e.stopPropagation()
                        }
                    }}
                  ></sl-input>
                </div>
                <div class="adding-checklist-controls">
                  <sl-button
                    disabled={!checklistItemElement}
                    on:mousedown={()=>{
                      addChecklistItem(cardId, list, checklistItemElement.value)
                      checklistItemElement.focus()
                    }}>
                      <SvgIcon icon=faPlus/>
                  </sl-button>
                  <sl-button 
                    on:mousedown={()=>{
                    addingChecklistItem = -1
                  }}>
                      <SvgIcon icon=faCancel/>
                  </sl-button>
                </div>
              </div>
            {/if}
          </div>
          {/each}
        {/if}
        {#if !addingChecklist}
          <div class="checklist">
            <div style="opacity: .7" on:click={(e)=>addingChecklist=true}>Add a checklist... <SvgIcon icon=faEdit size="12px"/></div>
          </div>
        {:else}
          <div class="checklist add-checklist">
            <sl-input use:doFocus class="add-checklist-input" bind:this={checklistElement} placeholder="New checklist title"
              on:sl-input={(e)=>{
                checklistTitle = e.target.value
              }}
              on:sl-blur={()=>{
                addingChecklist = false
                checklistElement.value = ""
              }}
        
              on:keydown={(e)=> {
                  if (e.keyCode == 27) {
                    checklistElement.blur()
                    e.stopPropagation()
                  }
                  if (e.keyCode == 13) {
                    addChecklist(cardId, checklistElement.value, Object.keys(card.checklists).length)
                    checklistElement.blur()
                    e.stopPropagation()
                  }
              }}
            ></sl-input>
            <sl-button
              disabled={!checklistTitle}
              on:mousedown={()=>{
                addChecklist(cardId, checklistElement.value, Object.keys(card.checklists).length)
              }}>
                <SvgIcon icon=faPlus/>
            </sl-button>
            <sl-button 
              on:mousedown={()=>{
              addingChecklist = false
            }}>
                <SvgIcon icon=faCancel/>
            </sl-button>
          </div>
        {/if}
      </div>

    </div>
    {#if labelTypes.length > 0}
    <div class="multi-select card-section">
      <div class="detail-label">Labels</div>
      <sl-select
        bind:this={labelSelect}
        on:sl-change={(e)=>{
          props.labels= labelSelect.value
          handleSave(props)
        }}
        value={selectedLabels.map(l=>l.value)}
        multiple 
        >
        {#each labelOptions as option}
          <sl-option value={option.value}>{option.label}</sl-option>
        {/each}
      </sl-select>
    </div>
    {/if}
    {#if $allProfiles.status=="complete"}
    <div class="multi-select card-section">
      <div class="detail-label">Assigned to</div>
      <sl-select
        value={selectedAvatars}
        on:sl-change={(e)=>{
          selectedAvatars = e.target.value
          setAgents()
        }}
        multiple 
        >
        {#each Array.from($allProfiles.value) as [hash, profile]}
        <sl-option value={encodeHashToBase64(hash)}>{profile.entry.nickname}</sl-option>
        {/each}
      </sl-select>

    </div>
    {/if}
    {#if store.weaveClient}
      <div style="display:flex; flex-wrap:wrap; align-items: center; margin-bottom:10px;">
        <div style="margin-left:10px; margin-right:10px;">
          <button title="Manage Card Attachments" class="attachment-button" on:click={()=>attachmentsDialog.open(card)} >          
            <SvgIcon icon="link" size="16px"/>
          </button>
        </div>
        {#if props.attachments}
          <AttachmentsList attachments={props.attachments}
            on:remove-attachment={(e)=>removeAttachment(e.detail)}/>
        {/if}
      </div>
    {/if}

    <sl-dialog bind:this={commentDialog}>
      <sl-textarea bind:this={commentTextElem}></sl-textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:5px;">
        <sl-button style="padding: 0 5px;" size="small"  text on:click={()=> {
          commentDialog.hide()
        }}>
            Cancel
        </sl-button>
        <sl-button style="padding: 0 5px;" size="small" variant="primary" text on:click={()=> {
          if (commenting=="new")
            addComment(commentingCardId, commentTextElem.value)
          else {
            updateComment(commentingCardId, commenting, commentTextElem.value)
          }
          commentDialog.hide()
        }}>
            Save
        </sl-button>
      </div>
    </sl-dialog>

    <div class="comments card-section">
      <div class="card-label">Comments <span class="comment-count">{card ? Object.keys(card.comments).length:""}</span></div>

      <div class="add-comment">
        <sl-input bind:this={commentElement} placeholder="Add a comment"
          on:sl-input={(e)=>{
              commentText = e.target.value
          }}
          on:sl-focus={()=>commentingFocused = true}
          on:sl-blur={()=>{
            commentingFocused = false
            commentElement.value = ""
            commentText = ""
          }}
     
          on:keydown={(e)=> {
              if (e.keyCode == 27) {
                commentElement.blur()
                e.stopPropagation()
              }
              if (e.keyCode == 13) {
                if (commentElement.value != "") {
                  addComment(cardId, commentElement.value)
                  commentElement.blur()
                  e.stopPropagation()
                }
              }
          }}

        >
        </sl-input>
        {#if commentingFocused}
          <sl-button
            class="comment-input-button"
            disabled={!commentText}
            on:mousedown={()=>{
              addComment(cardId, commentElement.value)
            }}>
              <SvgIcon icon=faPaperPlane size="20px"/>
          </sl-button>
          <sl-button
            class="comment-input-button"
            on:mousedown={()=>{
            commentingFocused = false
            commentElement.value = ""
          }}>
              <SvgIcon icon=faCancel size="20px"/>
          </sl-button>
        {/if}

      </div>

      <div class="comment-list">
        {#if card}
          {#each Object.values(card.comments).sort((a,b)=> a.timestamp - b.timestamp) as comment}
            <div class="comment">
              <div class="comment-header">
                <div class="comment-avatar"><Avatar size={20}  agentPubKey={decodeHashFromBase64(comment.agent)}/></div>
                <div class="comment-time-and-controls">
                  <div class="comment-time">{store.timeAgo.format(new Date(comment.timestamp))}</div>
                  {#if comment.agent==store.myAgentPubKeyB64}
                  <div class="comment-controls">
                    <div class="comment-control"
                      on:click={()=>editComment(cardId, comment)}
                      >
                      <SvgIcon icon=faEdit size=12px/>
                    </div>
                    <div class="comment-control"
                      on:click={()=>deleteComment(cardId, comment.id)}
                      >
                      <SvgIcon icon=faTrash size=12px/>
                    </div>
                  </div>
                  {/if}
                </div>
              </div>
              <span class="comment-text">{@html Marked.parse(comment.text)}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
<style>
  .select-column {

  }
  .category-selected {
    border: solid 2px rgba(35, 32, 74, .5);
  }
  .add-comment {
    position: absolute;
    padding: 20px;
    background-color: rgba(223, 232, 240, 1.0);
    bottom: 0px;
    margin-left: -20px;
    width: 100%;
    z-index: 100;
  }
  .card-editor {
    display: flex;
    flex-basis: 100%;
    font-style: normal;
    color: rgba(35, 32, 74, 1.0);
    justify-content: space-between;
    flex-direction: column;
  }

  .card-wrapper {
    max-height: calc(100vh - 160px);
    overflow-x: auto;
  }

  .card-wrapper::-webkit-scrollbar {
    width: 5px;
    background-color: transparent;
  }

  .card-wrapper::-webkit-scrollbar-thumb {
      height: 5px;
      border-radius: 5px;
      background: rgba(20,60,119,.3);
      opacity: 1;
  }
  .card-elements {
    display: flex;
    flex-direction: column;
    flex-basis: 100%;
    padding: 20px;
  }

  .category-selector {
    width: 100%;
    display: flex;
    padding-bottom: 15px;
  }

  .category-button {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    margin-right: 5px;
    transition: all .25s ease;
    transform: scale(1);
  }

  .category-button:hover {
    transform: scale(1.25);
    cursor: pointer;
  }

  .category-button:active {
    transform: scale(1.1);
    box-shadow: 0px 5px 5px rgba(53, 39, 211, 0.35);
  }

  .card-title {
    font-size: 24px;
    line-height: 30px;
  }

  .multi-select {
    margin: 5px 0;
  }

  .top-spacer {
    display: block;
    height: 35px;
  }

  .belongs-to {
    display: flex;
    margin-top: 0;
    font-size: 14px;
  }

  .belongs-to sl-select {
  }

  .details {
    max-height: 300px;
    overflow: auto;
    font-size: 16px;
    padding: 15px 0 0 0;
  }

  .comments {
    margin-top: 5px;
    padding-top: 5px;
    background: linear-gradient(180deg, rgba(102, 138, 174, 0.1) 0%, rgba(189, 209, 230, 0) 100%);
 
  }

  .comments.card-section {
    padding-bottom: 40px;
  }

  .comments .card-label {
    opacity: .5;
    padding-bottom: 15px;
  }

  .comment-count {
    min-width: 20px;
    background-color: rgba(35, 32, 75, 1);
    height: 20px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    color: #fff;
  }
  
  .comment {
    display:flex;
    flex-direction: column;
    padding-bottom: 15px;
    margin-bottom: 10px;
    box-shadow: 0px 4px 4px rgba(35, 32, 74, 0.15);
    background-color: #fff;
    line-height: 16px;
    color: #23204A;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
  }
  .comment-header {
    display:flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .comment-avatar {
    margin-right:5px;
  }
  .details-button {
    cursor: pointer;
    border-radius: 50%;
    padding:2px;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    transform: scale(1);
    transition: all .25s ease;
  }

  .details-button:hover {
    transform: scale(1.25);
  }

  .details-button:active {
    transform: scale(1.1);
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
  }

  .delete-button, .archive-button, .pocket-button {
    opacity: .7;
    transition: all .25s ease;
  }

  .delete-button:hover, .archive-button:hover, .pocket-button:hover {
    opacity: 1;
  }

  .card-controls {
    position: absolute;
    top: 15px;
    z-index: 10;
    right: 15px;
    display: flex;
  }

  .card-controls .details-button {
    margin-left: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(35, 32, 74, 0.1);
    box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
    border-radius: 5px;
  }

  .card-section {
    border-top: 1px dashed rgba(35, 32, 75, .1);
    padding: 20px;
    width: 100%;
  }

  .detail-label {
    color: rgba(35, 32, 75, .5);
    padding-bottom: 10px;
  }

  .details-button:hover {
    background-color: rgb(240, 249, 2244);
    border: solid 1px rgb(149, 219, 252);
    color:  rgb(3, 105, 161);
  }
  
  .comment-text {
    padding: 10px;
  }
  .comment-list {
    overflow-x: visible;
  }
  .comment-controls {
    display: block;
    text-align: right;
    width: 100%;
  }

  .comment-controls .comment-control {
    font-size: 12px;
    text-decoration: underline;
    padding: 5px;
    display: block;
    margin-left: 5px;
    display: inline-block;
    opacity: .5;
    transition: all .25s ease;
    margin-right: -5px;
  }

  .comment-control:hover {
    cursor: pointer;
    font-weight: bold;
    opacity: 1;
  }

  .comment-time {
    font-size: 12px;
    opacity: .5;
    min-width: 100px;
    text-align: right;
    position: relative;
    top: 4px;
  }

  .comment-input-button {
    margin-top: 10px;
  }

  .checklists {
  }

  .checklist {
    margin-top: 15px;
    border-radius: 5px;
    padding: 10px;
    font-size: 15px;
    border: 1px dashed rgba(35, 32, 75, .1);
  }

  .add-checklist {
    display: flex;
  }

  .checklist-item, .add-checklist-item {
    padding: 5px;
    display: flex;
    justify-content: space-between;
    background-color: rgba(241, 245, 247, 0);
    transition: all .25s ease;
    border-radius: 5px;
    align-items: center;
    font-size: 15px;
  }

  .checklist-item:hover {
    background-color: rgba(241, 245, 247, 1.0);
  }

  .add-checklist-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .add-checklist-item:hover {
    cursor: pointer;
    background-color: rgba(241, 245, 247, 1.0);
  }

  .add-item-icon, .adding-checklist-empty-box {
    background-color: rgba(212, 212, 216, .40);
    display: inline-flex;
    width: 16px;
    align-items: center;
    justify-content: center;
    height: 16px;
    border-radius: 3px;
    margin-right: 5px;
    position: relative;
    top: 3px;
  }

  .adding-checklist-empty-box {
    position: absolute;
    top: 10px;
    left: 5px;
    z-index: 10;
  }

  .list-title {
    font-size: 16px;
  }

  .delete-item, .convert-item {
    opacity: 0;
    position: relative;
    top: 2px;
    transition: all .25s ease;
  }

  .checklist-item:hover .delete-item {
    opacity: 1;
  }
  .checklist-item:hover .convert-item {
    opacity: 1;
  }
  .delete-item:hover, .convert-item:hover {
    cursor: pointer;
  }

  .adding-checklist-item {
    display: flex;
  }

  .adding-checklist-input-wrapper, .add-checklist-input {
    width: calc(100% - 90px);
    position: relative;
    font-size: 15px;
    margin-right: 3px;
  }

  .add-checklist-input::part(input)::placeholder, .adding-checklist-input::part(input)::placeholder {
    opacity: .7;
  }

  .adding-checklist-input::part(base) {
    padding-left: 15px;
  }
</style>
