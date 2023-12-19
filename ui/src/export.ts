import type { BoardState } from "./board"
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

export const exportBoard = (state: BoardState) => {
    const prefix = "kando"
    const fileName = sanitize(`${prefix}_export_${state.name}.json`)
    download(fileName, JSON.stringify(state))
    alert(`Your board was exported to your Downloads folder as: '${fileName}'`)
}