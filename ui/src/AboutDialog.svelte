<script lang="ts">
    import { getContext } from "svelte";
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import { faFileImport } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import type { KanDoStore } from "./kanDoStore";


    const { getStore } :any = getContext('kdStore');

    const store:KanDoStore = getStore();


    let dialog
    export const open = ()=>{dialog.show()}

    let fileinput;
	const onFileSelected = (e)=>{
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.addEventListener("load", async () => {
            const b = JSON.parse(reader.result as string)
            const board = await store.boardList.makeBoard(b)
            store.setUIprops({showMenu:false})
            store.setActiveBoard(board.hashB64())
        }, false);
        reader.readAsText(file);
    };
</script>


<sl-dialog label="KanDo!: UI v0.5.0-beta3 for DNA v0.3.x" bind:this={dialog} width={600} >
    <div class="about">
        <p>KanDo! is a demonstration Holochain app built by Holo.</p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code <a href="https://github.com/holochain-apps/kando">in our github repo</a>.
            This project's real-time syncronization is powered by <a href="https://github.com/holochain/syn">Syn</a>, 
            a library that makes it really easy to build this kind of real-time collaboaration into Holochain apps.
        </p>
    <p class="small">Copyright © 2023 Holochain Foundation.  This software is distributed under the MIT License</p>
    <div class="new-board" on:click={()=>{fileinput.click();}} title="Import Board"><Fa icon={faFileImport} size=2x style="margin-left: 15px;"/><span>Import Board </span></div>
    <input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
    </div>
</sl-dialog>

<style>
    .about {
        background-color: white;
    }
    .about p {

        margin-bottom:10px;
     }
     .small {
        font-size: 80%;
     }
     .new-board {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        height: 50px;
        background: #243076;
        border: 1px solid #4A559D;
        color: #fff;
        display: flex;
        align-items: center;
        border-radius: 5px;
    }

    .new-board span {
        color: #fff;
        display: block;
        padding: 0 15px;
    }
</style>
  