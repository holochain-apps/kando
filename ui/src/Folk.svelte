<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import ParticipantsDialog from './ParticipantsDialog.svelte';
    import AvatarDialog from './AvatarDialog.svelte';
    import { getContext, onMount } from "svelte";
    import type { KanDoStore } from "./kanDoStore";
    import Avatar from './Avatar.svelte';
    import { get } from 'svelte/store';    
    import Fa from 'svelte-fa'
    import { faUserGroup } from '@fortawesome/free-solid-svg-icons';
  import { isWeContext } from '@lightningrodlabs/we-applet';

    const { getStore } :any = getContext('kdStore');
    const store:KanDoStore = getStore();
    //@ts-ignore
    $: myProfile = get(store.profilesStore.myProfile).value
    $: myName =  myProfile ? myProfile.nickname  : ""
    let participantsDialog
    let editAvatarDialog

    onMount(async () => {
        // if (!myName) {
        //     editAvatarDialog.open()
        // }
	});

    const editAvatar = () => {
        editAvatarDialog.open()
    }

</script>
<div class="nav-button" on:click={()=>{participantsDialog.open()}} title="Show Participants">
    <Fa color="#fff" icon={faUserGroup} size=2x/></div>
{#if !isWeContext()}
    <div class="nav-button " on:click={editAvatar} title={myName ? myName:"Edit Avatar"}>
        <Avatar size={28} agentPubKey={store.myAgentPubKey} placeholder={true} showNickname={false}/>
    </div>
{/if}

<ParticipantsDialog bind:this={participantsDialog} />

<AvatarDialog bind:this={editAvatarDialog} />

<style>
</style>