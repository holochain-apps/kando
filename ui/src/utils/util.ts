import { type AppClient, type EntryHash, type DnaHash, CellType } from "@holochain/client";
//import type { HrlB64WithContext, WAL } from "@theweave/api";

export function onVisible(element, callback) {
    new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
        if(entry.intersectionRatio > 0) {
            callback(element);
        }
        });
    }).observe(element);
}

export type WALUrl = string

// export function hrlWithContextToB64(hrl: WAL): HrlB64WithContext {
//   return {
//     hrl: [encodeHashToBase64(hrl.hrl[0]), encodeHashToBase64(hrl.hrl[1])],
//     context: hrl.context === undefined ? 'null' : JSON.stringify(hrl.context),
//   };
// }
  
// export function hrlB64WithContextToRaw(hrlB64: HrlB64WithContext): WAL {
//   let context: any
//   try {
//     context = JSON.parse(hrlB64.context)
//   } catch (e) {

//   }
//   return {
//     hrl: [decodeHashFromBase64(hrlB64.hrl[0]), decodeHashFromBase64(hrlB64.hrl[1])],
//     context,
//   };
// }

export const hashEqual = (a:EntryHash, b:EntryHash) : boolean => {
  if (!a || !b) {
    return !a && !b
  }
  for (let i = a.length; -1 < i; i -= 1) {
    if ((a[i] !== b[i])) return false;
  }
  return true;
}

export const getMyDna = async (role:string, client: AppClient) : Promise<DnaHash>  => {
  const appInfo = await client.appInfo();
  const dnaHash = (appInfo.cell_info[role][0] as any)[
    CellType.Provisioned
  ].cell_id[0];
  return dnaHash
} 

export const isTauriContext = () => (window as any).__TAURI_INTERNALS__ !== undefined;
