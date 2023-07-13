<script lang="ts">
    import { Group, LabelDef, type BoardProps, CategoryDef } from './board';
    import { onMount } from 'svelte';
  	import DragDropList, { VerticalDropZone, reorder, type DropEvent } from 'svelte-dnd-list';
    import ColorPicker from 'svelte-awesome-color-picker';
    import 'emoji-picker-element';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import Fa from 'svelte-fa'
    import { faPlus, faGripVertical, faTrash} from '@fortawesome/free-solid-svg-icons';

    export let handleSave
    export let handleDelete = undefined
    export let cancelEdit
    export let text = ''
    export let props:BoardProps = {category:"", bgUrl: "",labels: []}
    export let groups: Array<Group>
    export let labelDefs: Array<LabelDef>
    export let categoryDefs: Array<CategoryDef>

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
      if (groups.length == 0) {
          groups = [new Group("Backlog"), new Group("Prioritized"), new Group("Doing"), new Group("Done")]
      }
    })

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        cancelEdit()
      } else if (e.key === "Enter" && e.ctrlKey) {
        handleSave(text, groups, labelDefs, props)
      } else  if (e.key === 'Tab') {
        // trap focus
        const tabbable = Array.from(document.querySelectorAll('input'))

        let index = tabbable.findIndex((elem)=>elem == document.activeElement)
  
        if (index === -1 && e.shiftKey) index = 0;

        index += tabbable.length + (e.shiftKey ? -1 : 1);
        index %= tabbable.length;

        tabbable[index].focus();
        e.preventDefault();
      }
    }

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
</script>

<svelte:window on:keydown={handleKeydown}/>
  <div class='board-editor'>
    <div class="edit-title">
      <div class="title-text">Title:</div> <sl-input class='textarea' maxlength="60" bind={text}  on:input={e=>text= e.target.value}></sl-input>
    </div>
    <div class="edit-groups unselectable">
      <div class="title-text">Columns:
        <sl-button circle size="small" on:click={() => addGroup()}>
          <Fa icon={faPlus}/>
        </sl-button>
      </div>
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
          <div class="grip" ><Fa icon={faGripVertical}/></div>
          <sl-input class='textarea' value={groups[index].name} on:input={e=>groups[index].name = e.target.value}>
          <sl-button circle size="small"  on:click={deleteGroup(index)}>
          <Fa icon={faTrash}/>
          </sl-button>
        </div>
      </DragDropList>
    </div>
    <div class="edit-label-defs unselectable">
      <div class="title-text">
        Labels:

        <sl-button circle size="small"  on:click={() => addLabelDef()}>
          <Fa icon={faPlus}/>
        </sl-button>
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
          <div class="grip" ><Fa icon={faGripVertical}/></div>
          <sl-button on:click={()=>{showEmojiPicker = index;emojiDialog.show()}} >
            <span style="font-size:180%">{labelDefs[index].emoji}</span>
          </sl-button>
          <sl-input class='textarea' value={labelDefs[index].toolTip} title="label name"
          on:input={e=>labelDefs[index].toolTip = e.target.value}> </sl-input>
          <sl-button on:click={deleteLabelDef(index)} >
            <Fa icon={faTrash}/>
          </sl-button>
        </div>
      </DragDropList> 
    </div>
    <div class="edit-category-defs unselectable">
      <div class="title-text">
        Categories:

        <sl-button circle size="small" on:click={() => addCategoryDef()}>
          <Fa icon={faPlus}/>
        </sl-button>
      </div>
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
          <div class="grip" ><Fa icon={faGripVertical}/></div>
          <sl-button icon on:click={()=>{
            hex = categoryDefs[index].color
            showColorPicker = index;colorDialog.show()}} >
            <div style="width:30px;height:30px;font-size:180%;border-radius:50%;background-color:{categoryDefs[index].color}"></div>
          </sl-button>
          <sl-input class='textarea' style="margin-left:10px" value={categoryDefs[index].name} title="category name"
          on:input={e=>categoryDefs[index].name = e.target.value}></sl-input>
          <sl-button icon on:click={deleteCategoryDef(index)} >
            <Fa icon={faTrash}/>
          </sl-button>
        </div>
      </DragDropList> 
    </div>
    <div class="edit-title">
      <div class="title-text">Background Image:</div> <sl-input class='textarea' maxlength="255" value={props.bgUrl} on:input={e=>props.bgUrl = e.target.value} />
    </div>

    <div class='controls'>
      {#if handleDelete}
        <sl-button on:click={handleDelete}>
          Archive
        </sl-button>
      {/if}
      <sl-button on:click={cancelEdit} style="margin-left:10px">
        Cancel
      </sl-button>
      <sl-button style="margin-left:10px" on:click={() => handleSave(text, groups, labelDefs, categoryDefs, props)} variant="primary">
        Save
      </sl-button>
    </div>
 </div>


   
 <style>
  .board-editor {
    display: flex;
    flex-basis: 270px;
    font-style: normal;
    font-weight: 600;
    color: #000000;
    flex-direction: column;
    justify-content: flex-start;
  }
  .textarea {
    width: 100%;
    padding: 5px;
    margin-right: 5px;
    font-weight: normal;
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
  .grip {
    margin-right:10px;
    cursor: pointer;
  }
  .title-text {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-weight: normal;
    font-size: 120%;
  }
  .unselectable {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
.modal {
  background-color: var(--light-text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
