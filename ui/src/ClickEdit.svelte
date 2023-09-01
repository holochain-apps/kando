<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import { onMount } from "svelte";
    import Fa from 'svelte-fa'
    import { faCancel } from '@fortawesome/free-solid-svg-icons';
    import { onVisible } from './util';

    export let handleSave
    export let text = ""
    export let placeholder = ""
    export let saveButtonText="Save"
    export let confirmButtons=false

    onMount(async () => {
        onVisible(inputElement,()=>{
            inputElement.focus()
            inputElement.select()
        })
	});
    let isEditing = false
    let inputElement

    const doCancel = ()=> {
        isEditing = false
    }


    $: text
</script>

<div class="click-edit">
    <div class="editing" class:hidden={!isEditing}>
        <sl-input placeholder={placeholder} value={text} bind:this={inputElement}
            on:sl-input={(e)=>text = e.target.value}
            on:sl-blur={()=>{
                handleSave(text)
                isEditing= false
            }}
        >
        </sl-input>
        {#if confirmButtons}
            <sl-button on:mousedown={()=>handleSave(text)}>
                {saveButtonText}
            </sl-button>
            <sl-button on:mousedown={doCancel}>
                <Fa icon={faCancel}/>
            </sl-button>
        {/if}
    </div>
    <div class="not-editing" class:hidden={isEditing}
        on:click={()=>{
            isEditing = true
        }}
    >
        {text}
    </div>
</div>


<style>
    .not-editing {
        width: 100%;
        font-weight: bold;
        font-size: 110%;
    }
    .hidden {
        display: none;
    }
</style>