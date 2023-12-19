import type { Board, BoardState } from "./board"
import sanitize from "sanitize-filename";
import { v1 as uuidv1 } from "uuid";

const EXPORT_FORMAT_VERSION = "1"

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
    _exportBoards(fileName, [state])
    alert(`Your board was exported to your Downloads folder as: '${fileName}'`)
}

export const exportBoards = (boards: Array<BoardState>) => {
    const prefix = "kando"
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-`
        + date.getHours() + "_" + ("00" + date.getMinutes()).slice(-2) +"_"+ ("00" + date.getSeconds()).slice(-2)

    const fileName = sanitize(`${prefix}_export_${formattedDate}.json`)
    _exportBoards(fileName, boards)
    alert(`Your board was exported to your Downloads folder as: '${fileName}'`)
}

const _exportBoards = (fileName:string, boards: Array<BoardState>) => {
    const exportObject = {
        version: EXPORT_FORMAT_VERSION,
        boards,
    }
    download(fileName, JSON.stringify(exportObject))
}

export const deserializeExport = (jsonExport:string) : Array<BoardState> => {
    try {
        const exportObject = JSON.parse(jsonExport)
        if (!exportObject.version) {
            throw("Expected export to have a version number")
        }
        return exportObject.boards

    } catch (e) {
        console.log("Error importing boards:", e)
        return []
    }
}