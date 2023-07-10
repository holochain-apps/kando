<script lang="ts">
    import {Button, Icon} from "svelte-materialify"
    import { mdiDelete, mdiDragVertical, mdiPlusCircleOutline } from '@mdi/js';
    import { Group, LabelDef, type BoardProps } from './board';
    import { onMount } from 'svelte';
  	import DragDropList, { VerticalDropZone, reorder, type DropEvent } from 'svelte-dnd-list';

    export let handleSave
    export let handleDelete = undefined
    export let cancelEdit
    export let text = ''
    export let props:BoardProps = {bgUrl: ""}
    export let groups: Array<Group>
    export let labelDefs: Array<LabelDef>
    export let title

    let titleElement

    const addLabelDef = () => {
      labelDefs.push(new LabelDef(`🙂`, `description: edit-me`, 1))
      labelDefs = labelDefs
    }
    const deleteLabelDef = (index) => () => {
      labelDefs.splice(index, 1)
      labelDefs = labelDefs
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
      titleElement.focus()
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

        //@ts-ignore
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
</script>

<svelte:window on:keydown={handleKeydown}/>
  <div class='board-editor'>
    <div class="dialog-title">{title}</div>
    <div class="edit-title">
      <div class="title-text">Title:</div> <input class='textarea' maxlength="60" bind:value={text} bind:this={titleElement} />
    </div>
    <div class="edit-groups unselectable">
      <div class="title-text">Columns:
        <Button icon on:click={() => addGroup()}>
          <Icon size="20px" path={mdiPlusCircleOutline}/>
        </Button>
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
          <Icon path={mdiDragVertical}/>
          <input class='textarea' bind:value={groups[index].name} />
          <Button icon on:click={deleteGroup(index)}>
            <Icon path={mdiDelete}/>
          </Button>
        </div>
      </DragDropList>
    </div>
    <div class="edit-label-defs unselectable">
      <div class="title-text">
        Labels:

        <Button icon on:click={() => addLabelDef()}>
          <Icon size="20px" path={mdiPlusCircleOutline}/>
        </Button>
      </div>
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
          <Icon path={mdiDragVertical}/>
          <input class='textarea emoji-input' bind:value={labelDefs[index].emoji} title="label emoji"/>
          <input class='textarea' bind:value={labelDefs[index].toolTip} title="label name"/>
          <Button icon on:click={deleteLabelDef(index)} >
            <Icon path={mdiDelete} />
          </Button>
        </div>
      </DragDropList> 
    </div>
    <div class="edit-title">
      <div class="title-text">Background Image:</div> <input class='textarea' maxlength="255" bind:value={props.bgUrl} />
    </div>

    <div class='controls'>
      {#if handleDelete}
        <Button on:click={handleDelete} size="small">
          Archive
        </Button>
      {/if}
      <Button on:click={cancelEdit} style="margin-left:10px" size="small">
        Cancel
      </Button>
      <Button style="margin-left:10px" size="small" on:click={() => handleSave(text, groups, labelDefs, props)} class="primary-color">
        Save
      </Button>
    </div>
 </div>


   
 <style>
  .board-editor {
    display: flex;
    flex-basis: 270px;
    margin: 20px;
    font-style: normal;
    font-weight: 600;
    color: #000000;
    flex-direction: column;
    justify-content: flex-start;
  }
  .textarea {
    background-color: rgba(255, 255, 255, 0.72);
    border: 1px solid #C9C9C9;
    box-sizing: border-box;
    border-radius: 3px;
    width: 100%;
    padding: 5px;
    margin-right: 5px;
    margin-bottom: 5px;
    font-weight: normal;
  }
  .emoji-input {
    width: 30px;
  }
  .num-input {
    width: 20px;
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
  }
  .label-def {
    display: flex;
    flex-direction: row;
    align-items: center;
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
</style>
