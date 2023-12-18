<script lang="ts">
    import { Group, LabelDef, type BoardProps, type BoardState, CategoryDef, UngroupedId, Board } from './board';
    import { getContext, onMount } from 'svelte';
  	import DragDropList, { VerticalDropZone, reorder, type DropEvent } from 'svelte-dnd-list';
    import ColorPicker from 'svelte-awesome-color-picker';
    import 'emoji-picker-element';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
    import sanitize from "sanitize-filename";
    import SvgIcon from "./SvgIcon.svelte"
    import { cloneDeep } from "lodash";
    import type { KanDoStore } from './store';
    import { encodeHashToBase64, type EntryHash } from '@holochain/client';

    const { getStore } :any = getContext('store');

    const store:KanDoStore = getStore();
    $: uiProps = store.uiProps

    $: activeBoard = store.boardList.activeBoard;
    $: state = $activeBoard ? $activeBoard.readableState() : undefined

    export let handleSave
    export let handleDelete = undefined
    export let cancelEdit

    let boardHash:EntryHash|undefined = undefined
    let text = ''
    let props:BoardProps = {bgUrl: ""}
    let groups: Array<Group> = []
    let labelDefs: Array<LabelDef> = []
    let categoryDefs: Array<CategoryDef> = []
    let nameInput

    const exportBoard = (state: BoardState) => {
        const prefix = "kando"
        const fileName = sanitize(`${prefix}_export_${state.name}.json`)
        download(fileName, JSON.stringify(state))
        alert(`Your board was exported to your Downloads folder as: '${fileName}'`)
    }

    const download = (filename: string, text: string) => {
      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }

    export const reset = () => {
      text = ''
      props = {bgUrl: ""}
      groups = [] // new Group("Backlog"), new Group("Prioritized"), new Group("Doing"), new Group("Done")
      labelDefs = []
      categoryDefs = []
      nameInput.value = ""
      nameInput.focus()
    }

    export const initialFocus = () => {
      nameInput.focus()
    }

    export const  edit = async (hash: EntryHash)=> {
      boardHash = hash
      const board: Board | undefined = await store.boardList.getBoard(boardHash)
      if (board) {
          const state = board.state()
          text = state.name
          nameInput.value = text
          groups = cloneDeep(state.groups)
          labelDefs = cloneDeep(state.labelDefs)
          categoryDefs = cloneDeep(state.categoryDefs)
          props = state.props ? cloneDeep(state.props) : {bgUrl:""}
          // remove the ungrouped ID TODO find a better way.
          const index = groups.findIndex((g)=>g.id == UngroupedId)
          if (index != -1) {
              groups.splice(index,1)
          }
      } else {
          console.log("board not found:", boardHash)
      }

    }

    const addLabelDef = () => {
      labelDefs.push(new LabelDef(`🙂`, `description: edit-me`))
      labelDefs = labelDefs
    }
    const deleteLabelDef = (index) => () => {
      labelDefs.splice(index, 1)
      labelDefs = labelDefs
    }
    const addCategoryDef = () => {
      categoryDefs.push(new CategoryDef(``,"#e9d74b"))
      categoryDefs = categoryDefs
    }
    const deleteCategoryDef = (index) => () => {
      categoryDefs.splice(index, 1)
      categoryDefs = categoryDefs
    }
    const addGroup = () => {
      groups.push(new Group(`column ${groups.length+1}`))
      groups = groups
    }
    const deleteGroup = (index) => () => {
      groups.splice(index, 1)
      groups = groups
    }
    onMount( async () => {
    })

    const onDropGroups = ({ detail: { from, to } }: CustomEvent<DropEvent>) => {
      if (!to || from === to || from.dropZoneID !== "groups") {
        return;
      }

      groups = reorder(groups, from.index, to.index);
    }
    const onDropLabelDefs = ({ detail: { from, to } }: CustomEvent<DropEvent>) => {
      if (!to || from === to || from.dropZoneID !== "labelDefs") {
        return;
      }

      labelDefs = reorder(labelDefs, from.index, to.index);
    }
    const onDropCategoryDefs = ({ detail: { from, to } }: CustomEvent<DropEvent>) => {
      if (!to || from === to || from.dropZoneID !== "categoryDefs") {
        return;
      }

      categoryDefs = reorder(categoryDefs, from.index, to.index);
    }
   let showEmojiPicker :number|undefined = undefined
   let emojiDialog,colorDialog
   let showColorPicker :number|undefined = undefined
   let hex
   $: valuesValid = text != ""
   let showArchived
   let saving = false
</script>

  <div class='board-editor'>
    <div class="edit-title setting">
      <div class="title-text">Title</div> <sl-input class='textarea' maxlength="60" bind:this={nameInput}  on:input={e=>text= e.target.value}></sl-input>
    </div>
    {#if boardHash}
    <div class="edit-groups unselectable setting">
      <div class="title-text">Columns</div>
      <DragDropList
        id="groups"
        type={VerticalDropZone}
	      itemSize={45}
        itemCount={groups.length}
        on:drop={onDropGroups}
        let:index
        itemClass="unselectable"
        >
        <div class="group">
          <div class="grip" ><SvgIcon icon=faGripVertical size=12px/></div>
          <sl-input class='textarea' value={groups[index].name} on:input={e=>groups[index].name = e.target.value}></sl-input>
          <sl-button size="small"  on:click={deleteGroup(index)}>
          <SvgIcon icon=faTrash size=12px/>
          </sl-button>
        </div>
      </DragDropList>

      <div class="add-item" on:click={() => addGroup()}>
        <SvgIcon icon=faPlus size=12px/>
        <span>Add Column</span>
      </div>
    </div>

    <div class="edit-label-defs unselectable setting">
      <div class="title-text">Labels</div>
      <DragDropList
        id="labelDefs"
        type={VerticalDropZone}
	      itemSize={45}
        itemCount={labelDefs.length}
        on:drop={onDropLabelDefs}
        let:index
        itemClass="unselectable"
        >
        <div class="label-def">
          <div class="grip" ><SvgIcon icon=faGripVertical size=12px/></div>
          <sl-button on:click={()=>{showEmojiPicker = index;emojiDialog.show()}} >
            <span style="font-size:180%">{labelDefs[index].emoji}</span>
          </sl-button>
          <sl-input class='textarea' value={labelDefs[index].toolTip} title="label name"
          on:input={e=>labelDefs[index].toolTip = e.target.value}> </sl-input>
          <sl-button size="small"  on:click={deleteLabelDef(index)} >
            <SvgIcon icon=faTrash size=12px/>
          </sl-button>
        </div>
      </DragDropList>
      <div class="add-item" on:click={() => addLabelDef()}>
        <SvgIcon icon=faPlus size=12px/>
        <span>Add Label</span>
      </div>
      <sl-dialog label="Choose Emoji" bind:this={emojiDialog}>
        <emoji-picker on:emoji-click={(e)=>  {
          labelDefs[showEmojiPicker].emoji = e.detail.unicode
          console.log(e.detail)
          showEmojiPicker = undefined
          emojiDialog.hide()
        }
        }></emoji-picker>
      </sl-dialog>
    </div>
    <div class="edit-category-defs unselectable setting">
      <div class="title-text">Categories</div>
      <sl-dialog label="Choose Color" bind:this={colorDialog}>

          <ColorPicker label=" " bind:hex
            isPopup={false}
            isOpen={true}
            isInput={false}
          />
          <div style="display: flex; flex-direction: row; justify-content:flex-end;">
            <div id="cancel-button" >
              <sl-button
                label="Cancel"
                on:click={() => colorDialog.hide()}
                style=" margin-right: 16px"
                >Cancel</sl-button>
            </div>
            <div id="save-button" >
              <sl-button 
                style=""
                on:click={() => {
                  categoryDefs[showColorPicker].color = hex
                  colorDialog.hide()
                }}
                variant=primary>Save</sl-button>
            </div>
          </div>
      </sl-dialog>

      <DragDropList
        id="categoryDefs"
        type={VerticalDropZone}
	      itemSize={45}
        itemCount={categoryDefs.length}
        on:drop={onDropCategoryDefs}
        let:index
        itemClass="unselectable"
        >
        <div class="category-def">
          <div class="grip" ><SvgIcon icon=faGripVertical size=12px/></div>
          <sl-button icon on:click={()=>{
            hex = categoryDefs[index].color
            showColorPicker = index;colorDialog.show()}} >
            <div style="width:30px;height:30px;font-size:180%;border-radius:50%;background-color:{categoryDefs[index].color}"></div>
          </sl-button>
          <sl-input class='textarea' style="margin-left:10px" value={categoryDefs[index].name} title="category name"
          on:input={e=>categoryDefs[index].name = e.target.value}></sl-input>
          <sl-button size="small" on:click={deleteCategoryDef(index)} >
            <SvgIcon icon=faTrash size=12px/>
          </sl-button>
        </div>
      </DragDropList> 
      <div class="add-item" on:click={() => addCategoryDef()}>
        <SvgIcon icon=faPlus size=12px/>
        <span>Add Category</span>
      </div>
    </div>
    <div class="edit-title setting">
      <div class="title-text">Background Image</div>
      <sl-input class='textarea' maxlength="255" value={props.bgUrl} on:input={e=>props.bgUrl = e.target.value} placeholder="Paste the URL of an image"/>
    </div>
    <div>
      <sl-checkbox bind:this={showArchived} checked={$uiProps.showArchived[encodeHashToBase64(boardHash)]}>Show Archived Cards</sl-checkbox>
    </div>
    {/if}
    <div class='controls'>
      {#if boardHash}
        <sl-button class="board-control" on:click={() => exportBoard($state)} title="Export">
          <SvgIcon icon=faFileExport /> Export
        </sl-button>
      {/if}
      {#if handleDelete}
        <sl-button class="board-control" on:click={handleDelete}>
          Archive
        </sl-button>
      {/if}
      <sl-button on:click={cancelEdit} class="board-control">
        Cancel
      </sl-button>

      <sl-button class="board-control"
        variant="primary"
        disabled={!valuesValid || saving} 
        style="margin-left:10px; width:70px;" on:click={async () => {
          saving = true
          await handleSave(text, groups, labelDefs, categoryDefs, props, showArchived? showArchived.checked:false)
          saving = false
          }} >
          
        <span >
          {#if saving}
            <div class="spinning"><SvgIcon icon=faSpinner></SvgIcon></div>
          {:else}
            Save
          {/if}
        </span>
        
      </sl-button>
    </div>
 </div>


   
 <style>
  .board-editor {
    display: flex;
    flex-basis: 270px;
    font-style: normal;
    font-weight: 600;
    flex-direction: column;
    justify-content: flex-start;
  }
  .textarea {
    width: 100%;
    padding: 5px;
    margin-right: 5px;
    font-weight: normal;
  }

  .setting {
    background-color: white;
    margin-bottom: 15px;
    box-shadow: 0px 2px 3px rgba(35, 32, 74, 0.15);
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

  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    padding-left: 7px;
    padding-top: 10px;
  }
  .group {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .label-def, .category-def {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .board-control {
    margin-right: 10px;
  }

  .grip {
    margin-right:10px;
    cursor: pointer;
  }
  .title-text {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-weight: normal;
    font-weight: bold;
    font-size: 18px;
    margin-bottom: 10px;
    color: rgba(86, 94, 109, 1.0);
  }
  .unselectable {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .add-item {
    background-color: white;
    margin: 0px 10px 10px 10px;
    box-shadow: 0px 4px 8px rgba(35, 32, 74, 0.25);
    border-top: 1px solid #e0e0e0;
    font-size: 16px;
    line-height: 16px;
    color: rgba(86, 94, 109, 1.0);
    border-radius: 5px;
    display:flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
    margin-top: 10px;
  }

  .add-item span {
    display: block;
    margin-left: 5px;
    color: rgba(86, 94, 109, 1.0);
  }
.modal {
  background-color: var(--light-text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
