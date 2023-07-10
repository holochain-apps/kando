import { createEventDispatcher } from "svelte";
import type { BoardState, Card } from "./board";
import { v1 as uuidv1 } from "uuid";
import { cloneDeep, isEqual } from "lodash";
import sanitize from "sanitize-filename";

const download = (filename: string, text: string) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export class Pane {    
    public dispatch
  
    constructor() {
        this.dispatch = createEventDispatcher()
    }
    
    exportBoard = (state: BoardState) => {
        const prefix = "kando"
        const fileName = sanitize(`${prefix}_export_${state.name}.json`)
        download(fileName, JSON.stringify(state))
        alert(`Your board was exported to your Downloads folder as: '${fileName}'`)
    }

    addCard = (text: string, group: uuidv1 , props: any) => {
        if (group === undefined) {group = 0}
        const card:Card = {
          id: uuidv1(),
          text,
          props,
        };
        this.dispatch("requestChange", [{ type: "add-card", value: card, group}]);
    };

    updateCard = (cards, id: uuidv1, closeFn) => (text:string, groupId: uuidv1, props:any) => {
        const card = cards.find((card) => card.id === id);
        if (!card) {
          console.error("Failed to find item with id", id);
        } else {
          let changes = []
          if (card.text != text) {
            changes.push({ type: "update-card-text", id: card.id, text: text })
          }
          console.log("card.props", card.props, "props", props)
          if (!isEqual(card.props, props)) {
            changes.push({ type: "update-card-props", id: card.id, props: cloneDeep(props)})
          }
          if (changes.length > 0) {
          this.dispatch("requestChange", changes);
          }
        }
        closeFn()
    };
    
    deleteCard = (id: uuidv1, closeFn) => () => {
        this.dispatch("requestChange", [{ type: "delete-card", id }]);
        closeFn()
    };
 

}