<script lang="ts">
  import { DEFAULT_PROPS, UngroupedId, UngroupedName, type CardProps, type CategoryDef} from "./board";
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import { cloneDeep, isEqual } from "lodash";
  import { v1 as uuidv1 } from "uuid";
  import { getContext } from 'svelte';
  import type { KanDoStore } from './stores/kando';
  import Avatar from './Avatar.svelte';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type { BoardDelta, Card, Checklist, ChecklistItem, Comment } from "./board";

  import { Marked } from "@ts-stack/markdown";
  import SvgIcon from "./SvgIcon.svelte";
  import ClickEdit from './ClickEdit.svelte';
  import ChecklistEditor from './ChecklistEditor.svelte';
  import AttachmentsList from './AttachmentsList.svelte';
  import AttachmentsDialog from "./AttachmentsDialog.svelte"
  import type { WAL } from '@theweave/api';

  
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
  const addChecklistWithItem = (id: uuidv1, title: string, order: number, text: string) => {
    const checklist:Checklist = {
      id: uuidv1(),
      title,
      items: [{checked: false, text}],
      order,
      timestamp: new Date().getTime(),
    }
    requestChanges([{ type: "add-card-checklist", id, checklist}])
  }
  const updateChecklist = (id: uuidv1, checklistId:uuidv1, title: string, order:number, items: Array<ChecklistItem>) => {
    requestChanges([{ type: "update-card-checklist", id, checklistId, title, order, items}]);
  }
  const updateChecklistTitle = (id: uuidv1, checklistId:uuidv1, title: string) => {
    const list = card?.checklists[checklistId]
    if (list && list.title != title) {
      updateChecklist(id, checklistId, title, list.order, list.items)
    }
  }
  const deleteChecklist = (id: uuidv1, checklistId:uuidv1) => {
    requestChanges([{ type: "delete-card-checklist", id, checklistId}]);
  }

  const addChecklistItem = (id: uuidv1, checklistId:uuidv1, text: string) => {
    const item = {checked:false, text}
    const changes:BoardDelta[] = [{ type: "add-checklist-item", id, checklistId, item }]
    requestChanges(changes)
  }

  const setChecklistItemStatus = (id: uuidv1, checklistId:uuidv1, idx: number, checked: boolean) => {
    const changes:BoardDelta[] = [{ type: "set-checklist-item-state", id, checklistId, itemId:idx, state:checked }]
    requestChanges(changes)

  }

  const deleteChecklistItem = (id: uuidv1, checklistId:uuidv1, idx: number) => {
    const changes:BoardDelta[] = [{ type: "delete-checklist-item", id, checklistId, itemId:idx }]
    requestChanges(changes)
  }

  const convertChecklistItem = (id: uuidv1, checklistId:uuidv1, idx: number) => {
    const list = card.checklists[checklistId]
    if (!list) return
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

    const changes:BoardDelta[] = [{ type: "convert-checklist-item", id, checklistId, itemId:idx, groupId, card: c }]
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

  let editDescriptionElement

  let attachmentsDialog : AttachmentsDialog

  const removeAttachment = (idx: number) => {
    props.attachments.splice(idx,1)
    handleSave(props)
  }

  const walToPocket = () => {
    const attachment: WAL = { hrl: [store.dnaHash, $activeBoard.hash], context: cardId }
    store.weaveClient?.assets.assetToPocket(attachment)
  }
</script>

{#if store.weaveClient}
  <AttachmentsDialog activeBoard={$activeBoard} bind:this={attachmentsDialog}></AttachmentsDialog>
{/if}

<div class='card-editor'>
  <div class={`card-wrapper ${showControls ? "card-wrapper-drawer" : "card-wrapper-standalone"}`}>
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
      <ChecklistEditor
        checklists={card && card.checklists ? card.checklists : {}}
        onAddChecklist={(title, order) => addChecklist(cardId, title, order)}
        onAddChecklistWithItem={(title, order, text) => addChecklistWithItem(cardId, title, order, text)}
        onDeleteChecklist={(checklistId) => deleteChecklist(cardId, checklistId)}
        onAddItem={(checklistId, text) => addChecklistItem(cardId, checklistId, text)}
        onToggleItem={(checklistId, itemIdx, checked) => setChecklistItemStatus(cardId, checklistId, itemIdx, checked)}
        onDeleteItem={(checklistId, itemIdx) => deleteChecklistItem(cardId, checklistId, itemIdx)}
        onConvertItem={(checklistId, itemIdx) => convertChecklistItem(cardId, checklistId, itemIdx)}
        onUpdateChecklistTitle={(checklistId, title) => updateChecklistTitle(cardId, checklistId, title)}
      />


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

    <div class={`comments card-section ${showControls ? "" : "card-section-standalone"}`}>
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
    overflow-x: auto;
  }

  .card-wrapper-drawer {
    height: calc(100vh - 170px );
  }

  .card-wrapper-standalone {
    height:  100vh;
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
    padding-bottom: 0px;
  }  
  
  .comments.card-section-standalone {
    padding-bottom: 70px;
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
</style>
