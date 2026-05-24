<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
  import SvgIcon from "./SvgIcon.svelte";
  import ClickEdit from './ClickEdit.svelte';
  import type { Checklists } from "./board";

  // The checklists to render.  Keyed by checklist id.
  export let checklists: Checklists = {}

  // Persistence is the parent's concern: the side-panel fires syn deltas on a
  // live card, while the new-card dialog mutates a local object.  We just emit
  // the semantic intent.
  export let onAddChecklist: (title: string, order: number) => void
  export let onDeleteChecklist: (checklistId: string) => void
  export let onAddItem: (checklistId: string, text: string) => void
  export let onToggleItem: (checklistId: string, itemIdx: number, checked: boolean) => void
  export let onDeleteItem: (checklistId: string, itemIdx: number) => void
  // Creates a checklist titled `title` already containing a first item, in one
  // step.  Used for the empty state so you can start typing tasks without first
  // creating and naming a checklist.
  export let onAddChecklistWithItem: (title: string, order: number, text: string) => void
  // Optional: only meaningful for a card that already exists on the board.
  export let onConvertItem: ((checklistId: string, itemIdx: number) => void) | undefined = undefined
  export let onUpdateChecklistTitle: ((checklistId: string, title: string) => void) | undefined = undefined
  // Name given to the checklist auto-created from the empty state.
  export let defaultChecklistTitle = "tasks"

  let addingChecklist = false
  let checklistTitle = ""
  let checklistElement
  // id of the checklist currently accepting a new item, or "" when none.
  let addingItemFor = ""
  let checklistItemElement
  // true while typing the very first item (before any checklist exists)
  let addingFirstItem = false
  // after auto-creating the first checklist, keep its add-item input open
  let focusNewChecklist = false

  const doFocus = (node) => {
    // otherwise we get an error from the shoelace element
    setTimeout(() => {
      node.focus()
    }, 50);
  }

  $: sortedChecklists = Object.values(checklists).sort((a, b) => a.order - b.order)

  // Once the auto-created checklist has landed, move the open item input onto it
  // so the next task can be typed immediately.
  $: if (focusNewChecklist && sortedChecklists.length > 0) {
    addingItemFor = sortedChecklists[0].id
    focusNewChecklist = false
  }

  const submitChecklist = () => {
    if (checklistElement.value) {
      onAddChecklist(checklistElement.value, Object.keys(checklists).length)
      checklistElement.value = ""
      checklistTitle = ""
    }
  }

  const submitItem = (checklistId: string) => {
    if (checklistItemElement.value) {
      onAddItem(checklistId, checklistItemElement.value)
      checklistItemElement.value = ""
    }
  }

  const submitFirstItem = () => {
    if (checklistItemElement.value) {
      onAddChecklistWithItem(defaultChecklistTitle, 0, checklistItemElement.value)
      checklistItemElement.value = ""
      addingFirstItem = false
      focusNewChecklist = true
    }
  }
</script>

<div class="checklists">
  {#if sortedChecklists.length === 0}
    <!-- Empty state: skip naming a checklist; the first item creates a "{defaultChecklistTitle}" checklist. -->
    <div class="checklist">
      {#if !addingFirstItem}
        <div class="add-checklist-item"
            on:click={() => { addingFirstItem = true }}>
            <div>
              <span class="add-item-icon"><SvgIcon icon=faPlus/></span>
              Add a checklist item
            </div>
        </div>
      {:else}
        <div class="adding-checklist-item">
          <div class="adding-checklist-input-wrapper">
            <div class="adding-checklist-empty-box"></div>
            <sl-input use:doFocus bind:this={checklistItemElement} placeholder="New checklist item" class="adding-checklist-input"
              on:sl-blur={() => {
                checklistItemElement.value = ""
              }}
              on:keydown={(e) => {
                  if (e.keyCode == 27) {
                    checklistItemElement.value = ""
                    addingFirstItem = false
                    e.stopPropagation()
                  }
                  if (e.keyCode == 13) {
                    submitFirstItem()
                    e.stopPropagation()
                  }
              }}
            ></sl-input>
          </div>
          <div class="adding-checklist-controls">
            <sl-button
              disabled={!checklistItemElement}
              on:mousedown={() => {
                submitFirstItem()
              }}>
                <SvgIcon icon=faPlus/>
            </sl-button>
            <sl-button
              on:mousedown={() => {
              addingFirstItem = false
            }}>
                <SvgIcon icon=faCancel/>
            </sl-button>
          </div>
        </div>
      {/if}
    </div>
  {:else}
  {#each sortedChecklists as list}
    <div class="checklist">
      <div class="list-title">
        <ClickEdit
          text={list.title}
          handleSave={(text) => {
            if (onUpdateChecklistTitle) onUpdateChecklistTitle(list.id, text)
          }}
          handleDelete={() => {
            onDeleteChecklist(list.id)
          }}
        >
        </ClickEdit>
      </div>
      {#each list.items as item, itemIdx}
        <div class="checklist-item">
          <sl-checkbox
            on:sl-change={(e) => {
              onToggleItem(list.id, itemIdx, e.target.checked)
            }}
            checked={item.checked}
            >{item.text}</sl-checkbox>
          <div style="disply:flex;align-items:center;">
            {#if onConvertItem}
              <span class="convert-item" title="Convert item to card" on:click={(e) => {
                e.stopPropagation();
                onConvertItem(list.id, itemIdx)
              }}><SvgIcon icon=convertCard size=18x style="opacity: .3;  margin-left: 3px; position: relative; top: -.15rem"/></span>
            {/if}
            <span class="delete-item" title="Delete item" on:click={(e) => {
              e.stopPropagation();
              onDeleteItem(list.id, itemIdx)
            }}><SvgIcon icon=faTrash size=12px style="opacity: .3;  margin-left: 3px; position: relative; top: -.15rem"/></span>
          </div>
        </div>
      {/each}
      {#if addingItemFor != list.id}
        <div class="add-checklist-item"
            on:click={() => {
              addingItemFor = list.id}}>
            <div>
              <span class="add-item-icon"><SvgIcon icon=faPlus/></span>
              Add item
            </div>
        </div>
      {:else}
        <div class="adding-checklist-item">
          <div class="adding-checklist-input-wrapper">
            <div class="adding-checklist-empty-box"></div>
            <sl-input use:doFocus bind:this={checklistItemElement} placeholder="New checklist item" class="adding-checklist-input"
              on:sl-blur={() => {
                checklistItemElement.value = ""
              }}
              on:keydown={(e) => {
                  if (e.keyCode == 27) {
                    checklistItemElement.value = ""
                    addingItemFor = ""
                    e.stopPropagation()
                  }
                  if (e.keyCode == 13) {
                    submitItem(list.id)
                    e.stopPropagation()
                  }
              }}
            ></sl-input>
          </div>
          <div class="adding-checklist-controls">
            <sl-button
              disabled={!checklistItemElement}
              on:mousedown={() => {
                submitItem(list.id)
                checklistItemElement.focus()
              }}>
                <SvgIcon icon=faPlus/>
            </sl-button>
            <sl-button
              on:mousedown={() => {
              addingItemFor = ""
            }}>
                <SvgIcon icon=faCancel/>
            </sl-button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
  {#if !addingChecklist}
    <div class="checklist">
      <div style="opacity: .7;cursor:pointer" on:click={(e) => addingChecklist = true}>Add a checklist... <SvgIcon icon=faEdit size="12px"/></div>
    </div>
  {:else}
    <div class="checklist add-checklist">
      <sl-input use:doFocus class="add-checklist-input" bind:this={checklistElement} placeholder="New checklist title"
        on:sl-input={(e) => {
          checklistTitle = e.target.value
        }}
        on:sl-blur={() => {
          addingChecklist = false
          checklistElement.value = ""
          checklistTitle = ""
        }}
        on:keydown={(e) => {
            if (e.keyCode == 27) {
              checklistElement.blur()
              e.stopPropagation()
            }
            if (e.keyCode == 13) {
              submitChecklist()
              checklistElement.blur()
              e.stopPropagation()
            }
        }}
      ></sl-input>
      <sl-button
        disabled={!checklistTitle}
        on:mousedown={() => {
          submitChecklist()
        }}>
          <SvgIcon icon=faPlus/>
      </sl-button>
      <sl-button
        on:mousedown={() => {
        addingChecklist = false
      }}>
          <SvgIcon icon=faCancel/>
      </sl-button>
    </div>
  {/if}
  {/if}
</div>

<style>
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
