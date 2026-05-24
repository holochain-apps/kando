<script lang="ts">
  import { DEFAULT_PROPS, type CardProps, type CategoryDef, type Checklists, type LabelDef } from "./board";
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import type { AgentPubKeyB64 } from "@holochain/client/lib/types";
  import { cloneDeep } from "lodash";
  import { v1 as uuidv1 } from "uuid";
  import { getContext } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import { encodeHashToBase64 } from "@holochain/client";
  import ChecklistEditor from "./ChecklistEditor.svelte";

  const { getStore } :any = getContext("store");
  let store: KanDoStore = getStore();
  $: allProfiles = store.profilesStore.allProfiles

  export let handleSave
  export let handleDelete = undefined
  export let handleArchive = undefined
  export let cancelEdit
  
  export let labelTypes: Array<LabelDef>
  export let categories: Array<CategoryDef>
  export let title

  let props:CardProps = DEFAULT_PROPS
  let cardId:uuidv1 = ""
  let columnId = undefined

  // Checklists aren't part of CardProps; we build them up locally here and ship
  // them with the card on save.  Keyed by checklist id, matching Card.checklists.
  let checklists:Checklists = {}

  let dialog

  export const open = ()=>{
    props = cloneDeep(DEFAULT_PROPS)
    checklists = {}
    init()
  }

  export const edit = (id: uuidv1, prps:CardProps, col:uuidv1)=>{
    cardId = id
    props = prps
    checklists = {}
    init()
  }

  const addChecklist = (title: string, order: number) => {
    const id = uuidv1()
    checklists[id] = { id, title, items: [], order, timestamp: new Date().getTime() }
    checklists = checklists
  }
  const addChecklistWithItem = (title: string, order: number, text: string) => {
    const id = uuidv1()
    checklists[id] = { id, title, items: [{ checked: false, text }], order, timestamp: new Date().getTime() }
    checklists = checklists
  }
  const deleteChecklist = (checklistId: string) => {
    delete checklists[checklistId]
    checklists = checklists
  }
  const addChecklistItem = (checklistId: string, text: string) => {
    checklists[checklistId].items.push({ checked: false, text })
    checklists = checklists
  }
  const toggleChecklistItem = (checklistId: string, idx: number, checked: boolean) => {
    checklists[checklistId].items[idx].checked = checked
    checklists = checklists
  }
  const deleteChecklistItem = (checklistId: string, idx: number) => {
    checklists[checklistId].items.splice(idx, 1)
    checklists = checklists
  }
  const updateChecklistTitle = (checklistId: string, title: string) => {
    if (checklists[checklistId]) {
      checklists[checklistId].title = title
      checklists = checklists
    }
  }

  const init = () => {
    if (props.agents !== undefined) {
        selectedAvatars = cloneDeep(props.agents)
    } else {
      selectedAvatars = []
    }
    if (props.labels !== undefined) {
        calcSelectedLabels(props.labels)
    } else {
      calcSelectedLabels([])
    }
    dialog.show()
  }

  let inputElement

  const calcSelectedLabels = (labels:Array<string>) => {
    selectedLabels = labels.filter(l=>labelTypes.findIndex(lt=>lt.type==l) >= 0).map(l=> {
          const idx = labelTypes.findIndex(lt => lt.type==l)
          const {emoji, toolTip} = labelTypes[idx]
          return {label: `${emoji} ${toolTip}`, value: l}
        })
  }

  const colors=["white","#D4F3EE","#E0D7FF","#FFCCE1","#D7EEFF", "#FAFFC7", "red", "green", "yellow", "LightSkyBlue", "grey"]
  const setCategory= (type) => {
    props.category  = type
    props = props
  }
  const setAgents = () => {
    props.agents = selectedAvatars
  }

  const labelOptions = ()  => {
    const options = labelTypes.map(({type, emoji, toolTip}) => 
    {return {label: `${emoji} ${toolTip}`, value: type}} )
    return options
  }

  const setLabels = () => {
    props.labels = selectedLabels.map(o => o.value)
    props = props
  }

  let selectedAvatars:Array<AgentPubKeyB64> = []
  let selectedLabels = []

  const getCategory = () : CategoryDef | undefined => {
    return categories.find(c=>c.type == props.category)
  }

  export const close = ()=>{
    dialog.hide()
  } 

let labelSelect
</script>
<sl-dialog bind:this={dialog} label={title} class="card-editor-dialog" style="--width: 560px; --sl-z-index-dialog: 1000;"
  on:sl-initial-focus={(e)=>{
    e.preventDefault()
    inputElement.focus()
  }}
  on:sl-request-close={(event)=>{
    if (event.detail.source === 'overlay') {
      event.preventDefault();    
    }}}>
<div class='card-editor' >

  <div class="card-elements">
    <sl-input label="Title" class='textarea' value={props.title} bind:this={inputElement}
    on:sl-input={e=>props.title = e.target.value} ></sl-input>
    <sl-textarea rows=4 label="Description" class='textarea' value={props.description}
    on:sl-input={e=>props.description = e.target.value} ><sl-textarea>

  </div>
  <div class="checklists-section">
    <div class="section-label">Checklists</div>
    <ChecklistEditor
      {checklists}
      onAddChecklist={addChecklist}
      onAddChecklistWithItem={addChecklistWithItem}
      onDeleteChecklist={deleteChecklist}
      onAddItem={addChecklistItem}
      onToggleItem={toggleChecklistItem}
      onDeleteItem={deleteChecklistItem}
      onUpdateChecklistTitle={updateChecklistTitle}
    />
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
      <div style="margin-left:10px;margin-bottom:3px;width:30px;height:30px;border-radius:50%;background-color:{getCategory().color}"></div>
    {/if}
  </div>
  {/if}
  {#if labelTypes.length > 0}
  <div class="multi-select">

    <sl-select
      bind:this={labelSelect}
      value={selectedLabels.map(l=>l.value)}
      label="Labels"
      multiple 
      >
      {#each labelOptions() as option}
        <sl-option value={option.value}>{option.label}</sl-option>
      {/each}
    </sl-select>


  </div>
  {/if}
  {#if $allProfiles.status=="complete"}
    <div class="multi-select">
      <sl-select
        value={selectedAvatars.join(" ")}
        label="Assigned To"
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
    <sl-button style="margin-left:5px" on:click={()=>{close();cancelEdit()}}>
      Cancel
    </sl-button>
    <sl-button style="margin-left:5px" variant="primary" on:click={() => {
      setAgents()
      if (labelTypes.length > 0)
        props.labels= labelSelect.value
      handleSave(columnId, props, checklists)
      close()
      }}>
      Save
    </sl-button>
  </div>
</div>
</sl-dialog>
<style>
  /* Keep the dialog within the viewport (below the app header) and let its
     body scroll internally rather than growing without bound. */
  .card-editor-dialog::part(panel) {
    max-height: 85vh;
  }
  .card-editor-dialog::part(body) {
    overflow-y: auto;
  }

  .card-editor {
    display: flex;
    flex-basis: 100%;
    font-style: normal;
  color: rgba(35, 32, 74, 1.0);
    justify-content: space-between;
    flex-direction: column;
  }

  .checklists-section {
    margin: 5px 0;
  }

  .section-label {
    font-size: var(--sl-input-label-font-size-medium, 1rem);
    color: var(--sl-input-label-color, inherit);
    margin-bottom: 4px;
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
</style>
