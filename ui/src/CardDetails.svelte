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
  import { faEdit, faTrash, faComments, faPlus, faClose, faPaperPlane, faCancel } from '@fortawesome/free-solid-svg-icons';
  import type { Comment } from "./board";

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

</script>
<sl-drawer bind:this={dialog}
  style="--width:700px"
  no-header
  on:sl-hide={()=>close()}
  >
<div class='card-editor' >

  <div class="card-elements">
    <div style="display:flex;justify-content:space-between">
      <div style="width:100%">
      <ClickEdit
        text={props.title} 
        handleSave={(text)=>{
          props.title = text
          handleSave(props)
        }}></ClickEdit>
      </div>
   
      <div class="details-button"
        on:click={(e)=>{close()}}
        >
        <Fa icon={faClose}/>
      </div>
    </div>
    <div>Column: {store.getCardGroupName(cardId, $state)}</div>
    <h4>Description</h4>

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
      <div style="display:flex;flex-direction: column">
        <div class="details" on:click={(e)=>editDescription()}>{@html Marked.parse(props.description)}</div>
        <div style="display:flex;justify-content:flex-end">
          <sl-button size="small" style="margin-left:5px;margin-top:10px" on:click={()=>editDescription()}>
            Edit
          </sl-button>
        </div>
      </div>
    {/if}


  </div>
  {#if categories.length > 0}

  <div style="display:flex; flex-direction:row;align-items:flex-end">
    <sl-select
      value={props.category}
      label="Category"
      on:sl-change={(e)=>{
        setCategory(e.target.value)
      }}
      >
      <sl-option value={""}>No Category</sl-option>
      {#each categories as category }
        <sl-option value={category.type}>{category.name}</sl-option>
      {/each}
    </sl-select>
        
    {#if props.category}
      <div style="margin-left:10px;margin-bottom:3px;width:30px;height:30px;border-radius:50%;background-color:{getCategory(props).color}"></div>
    {/if}
  </div>
  {/if}
  {#if labelTypes.length > 0}
  <div class="multi-select">

    <sl-select
      bind:this={labelSelect}
      on:sl-change={(e)=>{
        props.labels= labelSelect.value
        handleSave(props)
      }}
      value={selectedLabels.map(l=>l.value)}
      label="Labels"
      multiple 
      >
      {#each labelOptions as option}
        <sl-option value={option.value}>{option.label}</sl-option>
      {/each}
    </sl-select>


  </div>
  {/if}
  {#if Object.keys($avatars).length > 0}
  <div class="multi-select">
    <sl-select
      value={selectedAvatarsForSelect}
      label="Assigned To"
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

  <div class="comments">
    <h4>{card ? card.comments.length:""} Comments</h4>

    <div class="add-comment">
      <sl-input bind:this={commentElement} placeholder="Add a comment"
        on:sl-focus={()=>commentingFocused = true}
        on:sl-blur={()=>commentingFocused = false}
      >
      </sl-input>
      {#if commentingFocused}
        <sl-button on:mousedown={()=>{
          addComment(cardId, commentElement.value)
          commentElement.value = ""
        }}>
            <Fa icon={faPaperPlane}/>
        </sl-button>
        <sl-button on:mousedown={()=>{
          commentingFocused = false
          commentElement.value = ""
        }}>
            <Fa icon={faCancel}/>
        </sl-button>
      {/if}

    </div>

    <div class="comment-list">
      {#if card}
        {#each card.comments as comment}
          <div class="comment">
            <div class="comment-header">
              <div class="comment-avatar"><AvatarIcon size={20} avatar={$avatars[comment.agent]} key={decodeHashFromBase64(comment.agent)}/></div>
              {store.timeAgo.format(new Date(comment.timestamp))}
              {#if comment.agent==store.myAgentPubKey()}
              <div class="comment-controls">
                <div class="details-button"
                  on:click={()=>editComment(cardId, comment)}
                  >
                  <Fa icon={faEdit}/>
                </div>
                <div class="details-button"
                  on:click={()=>deleteComment(cardId, comment.id)}
                  >
                  <Fa icon={faTrash}/>
                </div>
              </div>
              {/if}
            </div>
            <span class="comment-text">{@html Marked.parse(comment.text)}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class='controls'>
    {#if handleDelete}
      <sl-button variant="danger" on:click={()=>handleDelete(cardId)}>
        Delete
      </sl-button>
    {/if}
    {#if handleArchive}
      <sl-button style="margin-left:5px" on:click={()=>{close();handleArchive()}}>
        Archive
      </sl-button>
    {/if}
    <sl-button style="margin-left:5px" on:click={()=>{close();}}>
      Close
    </sl-button>
  </div>
</div>
</sl-drawer>
<style>
  .add-comment {
    position: absolute;
    padding: 20px;
    background-color: #eee;
    bottom: 0px;
    margin-left: -20px;
    width: 100%;
  }
  .card-editor {
    display: flex;
    flex-basis: 270px;
    font-style: normal;
    color: #000000;
    justify-content: space-between;
    flex-direction: column;
  }
  .card-elements {
    display: flex;
    flex-direction: column;
    flex-basis: 100%;
  }

  .multi-select {
    margin: 5px 0;
  }
  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    padding-left: 7px;
    padding-top: 10px;
  }
  .details {
    max-height: 300px;
    overflow: auto;
  }
  .comments {
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid;
  }
  .comment {
    display:flex;
    flex-direction: column;
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid lightgray;
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
    width:20px;
    display: flex;
    justify-content: center;
  }
  .details-button:hover {
    background-color: rgb(240, 249, 2244);
    border: solid 1px rgb(149, 219, 252);
    color:  rgb(3, 105, 161);
  }
  
  .comment-text {
    margin-left: 10px;
  }
  .comment-list {
    max-height:200px;
    overflow-x:auto;
  }
  .comment-controls {
    display:flex;
    justify-self: flex-end;
  }
</style>
