<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { KanDoStore } from "./stores/kando";
  import type { BoardAndLatestState } from "./boardList";
  import {
    get,
    pipe,
    sliceAndJoin,
    toPromise,
  } from "@holochain-open-dev/stores";
  import {
    Board,
    DEFAULT_PROPS,
    type BoardState,
    type Card,
    type CardProps,
    type LabelDef,
  } from "./board";
  import { v1 as uuidv1 } from "uuid";
  import FeedbackItems from "./FeedbackItems.svelte";
  import KDLogoIcon from "./icons/KDLogoIcon.svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import AboutDialog from "./AboutDialog.svelte";
  import { encodeHashToBase64, type ActionHash } from "@holochain/client";

  const { getStore }: any = getContext("store");

  const store: KanDoStore = getStore();

  type StateAndHash = {
    hashB64: string;
    hash: ActionHash;
    board: Board;
    state: BoardState;
  };

  $: activeBoards = store.boardList.activeBoardHashes;

  $: uiProps = store.uiProps;

  $: boardData = store.boardList.boardData2;

  $: boards = pipe(store.boardList.activeBoardHashes, (boardHashes) =>
    boardHashes.map((boardHash) => get(boardData.get(boardHash)))
  );

  let boardStates: StateAndHash[] = [];

  const activeBoardStates = async () => {
    const states = [];
    const boards: ReadonlyMap<Uint8Array, BoardAndLatestState> =
      await toPromise(
        pipe(store.boardList.activeBoardHashes, (docHashes) => {
          return sliceAndJoin(store.boardList.boardData2, docHashes, {
            errors: "filter_out",
          });
        })
      );
    for (let [hash, b] of Array.from(boards.entries())) {
      const bas: StateAndHash = {
        state: b.latestState,
        hash,
        board: b.board,
        hashB64: encodeHashToBase64(hash),
      };
      states.push(bas);
    }
    boardStates = states;
  };
  onMount(async () => {
    while (boardStates.length == 0) {
      await activeBoardStates();
      if (boardStates.length > 0) {
        break;
      }
      await new Promise((r) => setTimeout(r, 10000));
    }
  });

  let titleElement;
  let descriptionElement;
  let labelSelect;

  let selectedBoardHashB64;
  let selectedBoardState;
  let selectedBoard;
  let selectedLabels = [];

  let props: CardProps = DEFAULT_PROPS;

  const updateBoard = async (board: StateAndHash) => {
    selectedLabels = [];
    selectedBoardHashB64 = board.board.hashB64;
    selectedBoardState = board.state;
    selectedBoard = board.board;
  };

  const labelOptions = (labelTypes: LabelDef[]) => {
    const options = labelTypes.map(({ type, emoji, toolTip }) => {
      return { label: `${emoji} ${toolTip}`, value: type };
    });
    return options;
  };

  let creating = false;
  const addCard = async () => {
    creating = true;
    if (selectedBoardState.labelDefs.length > 0)
      props.labels = labelSelect.value;
    const card: Card = {
      id: uuidv1(),
      comments: {},
      checklists: {},
      creator: store.myAgentPubKeyB64,
      props,
    };
    await selectedBoard.join();
    selectedBoard.requestChanges([
      { type: "add-card", value: card, group: selectedBoardState.groups[0].id },
    ]);
    titleElement.value = "";
    descriptionElement.value = "";
    props = DEFAULT_PROPS;
    creating = false;
  };

  $: valid =
    selectedBoardHashB64 && props.title && props.description && !creating;

  let aboutDialog;
  let newTopicDialog;
  let topicInput;
  let newTopicName;
  let topicSelect;
  let creatingTopic = false;
</script>

<AboutDialog bind:this={aboutDialog} />
<sl-dialog
  bind:this={newTopicDialog}
  label="New Topic"
  on:sl-initial-focus={(e) => {
    topicInput.focus();
    e.preventDefault();
  }}
  on:sl-request-close={(event) => {
    if (event.detail.source === "overlay") {
      event.preventDefault();
    }
  }}
>
  <sl-input
    class="textarea"
    on:sl-input={(e) => (newTopicName = e.target.value)}
    maxlength="60"
    bind:this={topicInput}
  ></sl-input>
  {#if creatingTopic}
    <p>Please be patient, this can take a bit...</p>
  {/if}
  <sl-button
    slot="footer"
    style="margin-left:5px"
    on:click={() => {
      newTopicDialog.hide();
    }}
  >
    Cancel
  </sl-button>
  <sl-button
    slot="footer"
    style="margin-left:5px"
    variant="primary"
    loading={creatingTopic}
    disabled={!newTopicName}
    on:click={async () => {
      creatingTopic = true;
      const boards = await toPromise(store.boardList.allBoards);
      const keys = Array.from(boards.keys());
      if (keys.length > 0) {
        const board = boards.get(keys[0]);
        const newBoard = await store.boardList.cloneBoard(
          board.latestState,
          newTopicName
        );
        let newBoardIndex = -1;
        while (newBoardIndex < 0) {
          await activeBoardStates();
          newBoardIndex = boardStates.findIndex(
            (s) => s.hashB64 == newBoard.hashB64
          );
          if (newBoardIndex >= 0) {
            const s = boardStates[newBoardIndex];
            topicSelect.value = s.hashB64;
            updateBoard(s);
          } else {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      } else {
        console.log("no source board found");
      }
      creatingTopic = false;
      newTopicDialog.hide();
    }}
  >
    Create
  </sl-button>
</sl-dialog>
<div class="board-menu">
  <div class="boards-section">
    {#if boardStates.length == 0}
      <div style="display:flex;width:100%;justify-content:center">
        <p style="margin:auto;color:white">
          Syncronizing with the network, please be patient, this can take a
          bit...
        </p>
      </div>
    {:else}
      <div class="add-feedback">
        <div class="type-header">Add Feedback</div>

        <div class="card-elements">
          <div style="display:flex; align-items: flex-end;">
            <sl-select
              label="Topic"
              placeholder="Choose a topic"
              bind:this={topicSelect}
            >
              {#each boardStates as board}
                <sl-option
                  on:click={async () => {
                    await updateBoard(board);
                  }}
                  value={board.hashB64}
                  >{board.state.name}
                </sl-option>
              {/each}
            </sl-select>
            <sl-button
              style="margin-left:5px;"
              on:click={() => {
                newTopicName = "";
                topicInput.value = "";
                newTopicDialog.show();
              }}
            >
              New Topic
            </sl-button>
          </div>
          <div style="display:flex; flex-direction:row;align-items:flex-end">
            {#if selectedBoardState && selectedBoardState.categoryDefs.length > 0}
              <sl-select
                label="Category"
                on:sl-change={(e) => {
                  props.category = e.target.value;
                  props = props;
                }}
              >
                <sl-option value={""}>No Category</sl-option>
                {#each selectedBoardState.categoryDefs as category}
                  <sl-option value={category.type}>{category.name}</sl-option>
                {/each}
              </sl-select>
            {/if}
            {#if selectedBoardState && selectedBoardState.labelDefs.length > 0}
              <sl-select
                style="width:100%"
                bind:this={labelSelect}
                value={selectedLabels.map((l) => l.value)}
                label="Labels"
                multiple
              >
                {#each labelOptions(selectedBoardState.labelDefs) as option}
                  <sl-option value={option.value}>{option.label}</sl-option>
                {/each}
              </sl-select>
            {/if}
          </div>
          <sl-input
            label="Title"
            class="textarea"
            bind:this={titleElement}
            on:sl-input={(e) => {
              props.title = e.target.value;
              props = props;
            }}
          ></sl-input>
          <sl-textarea
            rows="10"
            label="Description"
            class="textarea"
            bind:this={descriptionElement}
            on:sl-input={(e) => {
              props.description = e.target.value;
              props = props;
            }}><sl-textarea> </sl-textarea></sl-textarea
          >
        </div>
        <div class="controls">
          <sl-button
            loading={creating}
            style="margin-left:5px"
            variant="primary"
            disabled={!valid}
            on:click={async () => {
              await addCard();
            }}
          >
            Send Feedback
          </sl-button>
        </div>
      </div>

      <div class="my-feedback">
        <div class="type-header">My Feedback</div>
        {#each boardStates as board}
          <FeedbackItems boardHash={board.hash}></FeedbackItems>
        {/each}
      </div>
    {/if}
  </div>
  <div class="footer" style="width:100%">
    <div
      on:click={() =>
        store.setUIprops({ showFeedback: !$uiProps.showFeedback })}
      class="logo"
      title="About KanDo!"
    >
      <KDLogoIcon />
    </div>
    <div on:click={() => aboutDialog.open()}>
      <SvgIcon icon="info" color="#fff"></SvgIcon>
    </div>
    {#if boardStates.length > 0}
        <sl-button style="margin-left:10px" size="small" pill on:click={()=>store.setUIprops({showFeedback:!$uiProps.showFeedback})}>All Boards</sl-button>
    {/if}
  </div>
</div>

<style>
  .boards-section {
    display: flex;
    width: 100%;
  }

  .board-menu {
    height: calc(100vh - 50px);
    overflow-y: auto;
    overflow-x: hidden;
    min-width: 330px;
    width: 100vw;
    display: flex;
    flex-direction: row;
    background: linear-gradient(94.53deg, #164b9a 12.76%, #5b47d6 99.41%);
    flex: 0 0 auto;
    align-items: flex-start;
    position: relative;
    padding: 15px;
    padding-bottom: 50px;
    color: white;
  }

  .board-menu::-webkit-scrollbar {
    width: 10px;
    background-color: transparent;
  }

  .board-menu::-webkit-scrollbar-thumb {
    height: 5px;
    border-radius: 0;
    background: rgba(20, 60, 119, 0.9);
    opacity: 1;
  }

  .add-feedback {
    margin-right: 20px;
    max-width: 500px;
  }

  div {
    color: #eee;
  }
  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    padding-left: 7px;
    padding-top: 10px;
  }

  .type-header {
    font-size: 14;
    font-weight: bold;
    margin-top: 20px;
    margin-bottom: 10px;
  }

  .footer {
    position: fixed;
    padding: 10px;
    border-radius: 0;
    bottom: 0px;
    height: 40px;
    display: flex;
    align-items: center;
    width: 330px;
    left: 0;
    background-color: rgba(23, 55, 123, 0.9);
    animation-duration: 0.3s;
    animation-name: slideIn;
    animation-iteration-count: 1;
    animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1.1);
    z-index: 1000;
    --margin-end-position: 0px;
    --margin-start-position: -330px;
    margin-left: 0;
  }

  .footer.slideOut {
    animation-duration: 0.3s;
    animation-name: slideIn;
    --margin-end-position: -330px;
    animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1.1);
    --margin-start-position: 0px;
    margin-left: -330px;
  }

  @keyframes slideIn {
    from {
      margin-left: var(--margin-start-position);
      backdrop-filter: blur(10px);
    }

    to {
      margin-left: var(--margin-end-position);
      backdrop-filter: blur(0px);
    }
  }

  .footer div {
    display: inline-block;
  }

  .footer:hover {
    cursor: pointer;
  }

  .logo {
    margin-right: 5px;
  }

  .board-bg {
    position: absolute;
    z-index: 0;
    height: 100%;
    width: 100%;
    background-size: cover;
  }
</style>
