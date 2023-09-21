<script lang="ts">
  import type { Avatar } from './boardList';
  import type { Readable } from 'svelte/store';
  import { UngroupedId, type CardProps, type CategoryDef, type LabelDef } from "./board";
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
  import type { AgentPubKeyB64 } from "@holochain/client/lib/types";
  import { cloneDeep, isEqual } from "lodash";
  import { v1 as uuidv1 } from "uuid";
  import { getContext } from 'svelte';
  import type { KanDoStore } from './kanDoStore';
  import AvatarIcon from './AvatarIcon.svelte';
  import { decodeHashFromBase64 } from '@holochain/client';
  import { faEdit, faTrash, faPlus, faArchive, faClose, faPaperPlane, faCancel } from '@fortawesome/free-solid-svg-icons';
  import type { Checklist, ChecklistItem, Comment } from "./board";

  import { Marked, Renderer } from "@ts-stack/markdown";
  import Fa from 'svelte-fa';
  import ClickEdit from './ClickEdit.svelte';

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
  
  const { getStore } :any = getContext("kdStore");
  let store: KanDoStore = getStore();
  $: activeBoardHash = store.boardList.activeBoardHash;
  $: state = store.boardList.getReadableBoardState($activeBoardHash);
  $: card = $state.cards.find(c=>c.id == cardId)
  $: props = cloneDeep(card ? card.props : DEFAULT_PROPS)
  $: labelTypes = $state.labelDefs
  $: categories = $state.categoryDefs
  $: labelOptions = labelTypes.map(({type, emoji, toolTip}) => 
    {return {label: `${emoji} ${toolTip}`, value: type}} )
  $: selectedLabels = calcSelectedLabels(props.labels)
  $: selectedAvatars = cloneDeep(props.agents)
  $: selectedAvatarsForSelect = selectedAvatars.join(" ")

  export let avatars: Readable<{[key: string]: Avatar}> 

  const DEFAULT_PROPS = {title:"", description:"", category: "", agents:[], labels:[]}

  //let props:CardProps = DEFAULT_PROPS
  let cardId:uuidv1 = ""

  let dialog

  export const open = (id: uuidv1)=>{
    cardId = id
    dialog.show()
  }

  let inputElement

  const calcSelectedLabels = (labels:Array<string>) => {
    return labels.filter(l=>labelTypes.findIndex(lt=>lt.type==l) >= 0).map(l=> {
          const idx = labelTypes.findIndex(lt => lt.type==l)
          const {emoji, toolTip} = labelTypes[idx]
          return {label: `${emoji} ${toolTip}`, value: l}
        })
  }

  const setCategory= (type) => {
    props.category  = type
    props = props
    handleSave(props)
  }
  const setAgents = () => {
    props.agents = selectedAvatars
    handleSave(props)
  }

  const avatarNames = () => {
    const options= Object.entries($avatars).map(([key,value]) => 
    {return {label: value["name"] ? value["name"]:key, value: key}} )
    return options
  }

  const setLabels = () => {
    props.labels = selectedLabels.map(o => o.value)
    props = props
  }

  const getCategory = (p) : CategoryDef | undefined => {
    return categories.find(c=>c.type == p.category)
  }

  export const reset = ()=>{
    dialog.hide()
    editingTitle = false
    editingDescription = false
  }

  const close = ()=> {
    store.boardList.setActiveCard(undefined)
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
    store.boardList.requestBoardChanges($activeBoardHash,changes)
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
      agent: store.myAgentPubKey(),
      timestamp: new Date().getTime()
    }
    requestChanges([{ type: "add-card-comment", id, comment}])
  }
  const updateComment = (id: uuidv1, commentId:uuidv1, text: string) => {
    requestChanges([{ type: "update-card-comment", id, commentId, text}]);
  }
  const deleteComment = (id: uuidv1, commentId:uuidv1) => {
    requestChanges([{ type: "delete-card-comment", id, commentId}]);
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
    let items = cloneDeep(list.items)
    if (!items) {
      items = [item]
    } else {
      items.push(item)
    }
    updateChecklist(id, list.id, list.title, list.order, items)
  }


  const setChecklistItemStatus = (id: uuidv1, list:Checklist, idx: number, checked: boolean) => {
    let items = cloneDeep(list.items)
    items[idx].checked = checked
    updateChecklist(id, list.id, list.title, list.order, items)
  }


  const deleteChecklistItem = (id: uuidv1, list:Checklist, idx: number) => {
    let items = cloneDeep(list.items)
    items.splice(idx, 1)
    updateChecklist(id, list.id, list.title, list.order, items)
  }

  const editDescription = () => {
    editingDescription=true; 
    editDesc = `${props.description}`
  }
  const cancelEditDescription = () => {
    editingDescription=false; 
    editDesc = ``
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
</script>
<sl-drawer class="edit-card" bind:this={dialog}
  style="--size:500px"
  no-header
  on:sl-hide={()=>close()}
  >

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
      {:else}
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
        <div class="card-controls">
            {#if handleDelete}
              <div class="details-button delete-button" title="Delete this card" on:click={()=>handleDelete(cardId)}>
                <Fa icon={faTrash} style="width: 16px; height: 16px;"/>
              </div>
            {/if}
            {#if handleArchive}
              <div class="details-button archive-button" title="Archive this card" on:click={()=>{close();handleArchive()}}>
                <Fa icon={faArchive} style="width: 16px; height: 16px;"/>
              </div>
            {/if}
          <div class="details-button" title="Close this card" on:click={(e)=>{close()}}>
            <Fa icon={faClose} style="width: 24px; height: 24px;"/>
          </div>
        </div>
      </div>
      <div class="belongs-to">In column <strong>{store.getCardGroupName(cardId, $state)}</strong></div>
      {#if editingDescription}
        <sl-textarea rows=10 class='textarea' value={editDesc} 
          on:sl-input={e=>editDesc = e.target.value}
          ></sl-textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:10px">
            <sl-button size="small" style="margin-left:5px" on:click={()=>cancelEditDescription()}>
              Cancel
            </sl-button>
            <sl-button size="small" style="margin-left:5px" variant="primary" 
              on:click={()=>{
                props.description = editDesc
                handleSave(props)
                editingDescription=false}}>
              Save
            </sl-button>
          </div>
      {:else}
          {#if props.description}
        <div style="display:flex;flex-direction: column">
          <div class="details" on:click={(e)=>editDescription()}>{@html Marked.parse(props.description)}</div>
        </div>
          {:else}
          <div style="display:flex;flex-direction: column">
            <div class="details" style="opacity: .7" on:click={(e)=>editDescription()}>Add a description... <Fa icon={faEdit} style="width: 12px; height: 12px;"/></div>
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
                <span class="delete-item"  on:click={(e)=>{
                  e.stopPropagation();
                  deleteChecklistItem(cardId,list,itemIdx)
                 }}><Fa icon={faTrash} style="opacity: .3; height: .875rem; margin-left: 3px; position: relative; top: -.15rem"/></span >
                
            </div>
            {/each}
            {#if addingChecklistItem != idx}
              <div class="add-checklist-item" 
                  on:click={()=>{
                    addingChecklistItem=idx}}>
                  
                  <div>
                    <span class="add-item-icon"><Fa icon={faPlus}/></span>
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
                      <Fa icon={faPlus}/>
                  </sl-button>
                  <sl-button 
                    on:mousedown={()=>{
                    addingChecklistItem = -1
                  }}>
                      <Fa icon={faCancel}/>
                  </sl-button>
                </div>
              </div>
            {/if}
          </div>
          {/each}
        {/if}
        {#if !addingChecklist}
          <div class="checklist">
            <div style="opacity: .7" on:click={(e)=>addingChecklist=true}>Add a checklist... <Fa icon={faEdit} style="width: 12px; height: 12px;"/></div>
          </div>
        {:else}
          <div class="checklist add-checklist">
            <sl-input class="add-checklist-input" bind:this={checklistElement} placeholder="New checklist title"
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
                <Fa icon={faPlus}/>
            </sl-button>
            <sl-button 
              on:mousedown={()=>{
              addingChecklist = false
            }}>
                <Fa icon={faCancel}/>
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
    {#if Object.keys($avatars).length > 0}
    <div class="multi-select card-section">
      <div class="detail-label">Assigned to</div>
      <sl-select
        value={selectedAvatarsForSelect}
        on:sl-change={(e)=>{
          selectedAvatars = e.target.value
          setAgents()
        }}
        multiple 
        >
        {#each avatarNames() as avatar}
        <sl-option value={avatar.value}>{avatar.label}</sl-option>
        {/each}
      </sl-select>

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
          }}
     
          on:keydown={(e)=> {
              if (e.keyCode == 27) {
                commentElement.blur()
                e.stopPropagation()
              }
              if (e.keyCode == 13) {
                addComment(cardId, commentElement.value)
                commentElement.blur()
                e.stopPropagation()

              }
          }}

        >
        </sl-input>
        {#if commentingFocused}
          <sl-button
            disabled={!commentText}
            on:mousedown={()=>{
              addComment(cardId, commentElement.value)
            }}>
              <Fa icon={faPaperPlane}/>
          </sl-button>
          <sl-button 
            on:mousedown={()=>{
            commentingFocused = false
            commentElement.value = ""
          }}>
              <Fa icon={faCancel}/>
          </sl-button>
        {/if}

      </div>

      <div class="comment-list">
        {#if card}
          {#each Object.values(card.comments).sort((a,b)=> a.timestamp - b.timestamp) as comment}
            <div class="comment">
              <div class="comment-header">
                <div class="comment-avatar"><AvatarIcon size={20} avatar={$avatars[comment.agent]} key={decodeHashFromBase64(comment.agent)}/></div>
                <div class="comment-time-and-controls">
                  <div class="comment-time">{store.timeAgo.format(new Date(comment.timestamp))}</div>
                  {#if comment.agent==store.myAgentPubKey()}
                  <div class="comment-controls">
                    <div class="comment-control"
                      on:click={()=>editComment(cardId, comment)}
                      >
                      <Fa icon={faEdit} style="width: 12px; height: 12px;"/>
                    </div>
                    <div class="comment-control"
                      on:click={()=>deleteComment(cardId, comment.id)}
                      >
                      <Fa icon={faTrash} style="width: 12px; height: 12px;"/>
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
</sl-drawer>
<style>
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
    flex-basis: 270px;
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

  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    padding-left: 7px;
    padding-top: 10px;
  }

  .comment-time-and-controls {
    display: flex;
  }

  .edit-card::part(base) {
    height: calc(100vh - 97px);
    bottom: 0;
    top: initial;
    z-index: 150;
  }

  .edit-card::part(body) {
    padding: 0;
  }

  .edit-card::part(panel) {
    box-shadow: 0px 10px 15px rgba(35, 32, 74, 0.2);
  }

  .edit-card::part(overlay) {
    display: none;
  }

  .belongs-to {
    opacity: .6;
    margin-top: 0;
    font-size: 14px;
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

  .delete-button, .archive-button {
    opacity: .7;
    transition: all .25s ease;
  }

  .delete-button:hover, .archive-button:hover {
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

  .delete-item {
    opacity: 0;
    position: relative;
    top: 2px;
    transition: all .25s ease;
  }

  .checklist-item:hover .delete-item {
    opacity: 1;
  }

  .delete-item:hover {
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
