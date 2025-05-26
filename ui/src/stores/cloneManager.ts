import {
  type AppClient,
  encodeHashToBase64,
  decodeHashFromBase64,
  type DnaHash,
  type CellInfo,
  CellType,
  type CellId,
  type ProvisionedCell,
  type AppInfo,
} from '@holochain/client';
import { get, writable, type Writable } from "svelte/store";
import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
import type { WeaveClient } from '@theweave/api';
import { v7 as uuidv7 } from "uuid";
import { asyncDerived, type Loadable } from '@square/svelte-store';
import { hashEqual } from '../utils/util';
import { KanDoStore, ROLE_NAME } from './kando';

export interface CellInfoNormalized {
  originalDnaHash: Uint8Array;
  cellId: CellId;
  cellInfo: CellInfo;
  roleName: string;
  name: string;
  networkSeed: string;
  displayName: string;
}

export class KanDoCloneManagerStore {
  activeDnaHash: Writable<DnaHash>;
  activeCellInfoNormalized: Loadable<CellInfoNormalized>;
  activeStore: Loadable<KanDoStore>;
  
  constructor(
    public client: AppClient,
    public weaveClient?: WeaveClient,
  ) {
    this.activeDnaHash = writable<DnaHash>();
    this.activeDnaHash.subscribe(this._saveActiveDnaHash);
    this.activeCellInfoNormalized = asyncDerived(this.activeDnaHash, async ($activeDnaHash) => {
      const appInfo = await this.client.appInfo();
      if(!$activeDnaHash) {
        await this._loadActiveDnaHash(appInfo);
        $activeDnaHash = get(this.activeDnaHash);
      }
      const cellInfo = this._findCellInfoWithDnaHash(appInfo, $activeDnaHash);
      return this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell, cellInfo)
    });
    this.activeStore = asyncDerived([this.activeDnaHash, this.activeCellInfoNormalized], async ([$activeDnaHash, $activeCellInfoNormalized]) => {
      await this.activeCellInfoNormalized.load();
      
      const profilesClient = this.weaveClient !== undefined ? weaveClient.renderInfo.profilesClient : new ProfilesClient(this.client, $activeCellInfoNormalized.roleName);
      return new KanDoStore(this, new ProfilesStore(profilesClient), $activeDnaHash, $activeCellInfoNormalized.roleName);
    });
  }
  
  async list(): Promise<CellInfoNormalized[]> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];
    
    let cellsNormalized =  cells.map((cell) => this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell, cell));
    cellsNormalized.sort((a,b) => a.networkSeed < b.networkSeed ? -1 : 1);
    
    return cellsNormalized;
  }
  
  create(name: string) {
    return this.client.createCloneCell({
      name,
      role_name: ROLE_NAME,
      modifiers: {
        network_seed: uuidv7(),
      }
    });
  }
  
  join(name: string, networkSeed: string) {
    return this.client.createCloneCell({
      name,
      role_name: ROLE_NAME,
      modifiers: {
        network_seed: networkSeed 
      }
    });
  }
  
  disable(cellId: CellId) {
    return this.client.disableCloneCell({ clone_cell_id: { type: "dna_hash", value: cellId[0] }});
  }
  
  enable(cellId: CellId) {
    return this.client.enableCloneCell({ clone_cell_id: {type: "dna_hash", value: cellId[0] }})
  }
  
  activate(cellId: CellId) {
    this.activeDnaHash.set(cellId[0]);
  }
  
  private async _loadActiveDnaHash(appInfo: AppInfo) {
    console.log("_loadActiveDnaHash", appInfo);

    // Load active dna hash from local storage
    const activeDnaHashB64 = localStorage.getItem("activeDnaHash");    

    // Confirm that loaded dna hash is valid and cell exists
    if(activeDnaHashB64 !== null && activeDnaHashB64 !== undefined) {
      const activeDnaHash = decodeHashFromBase64(activeDnaHashB64);
      const matchingCellInfo = this._findCellInfoWithDnaHash(appInfo, activeDnaHash);

      if(matchingCellInfo !== undefined) {
        this.activeDnaHash.set(activeDnaHash);
        return;
      }
    }
      
    // Otherwise, set active dna hash to default
    this._setDefaultActiveDnaHash(appInfo);
  }

  private _setDefaultActiveDnaHash(appInfo: AppInfo) {
    console.log("_setDefaultActiveDnaHash", appInfo);

    if (appInfo.cell_info[ROLE_NAME][0].type !== CellType.Provisioned) {
      throw("incorrect cell type, must be provisioned")
    }
    const defaultDnaHash = appInfo.cell_info[ROLE_NAME][0].value.cell_id[0];
    this.activeDnaHash.set(defaultDnaHash);
  }
  
  private _saveActiveDnaHash(val: DnaHash) {
    console.log("_saveActiveDnaHash", val);

    if(val !== undefined && val !== null) {
      localStorage.setItem("activeDnaHash", encodeHashToBase64(val));
    }
  }

  private _findCellInfoWithDnaHash(appInfo: AppInfo, dnaHash: Uint8Array): CellInfo | undefined {
    const cellInfo = appInfo.cell_info[ROLE_NAME].find((cellInfo: CellInfo) => {
      if(cellInfo.type === CellType.Provisioned) {
        return hashEqual(cellInfo.value.cell_id[0], dnaHash);
      } else if(cellInfo.type === CellType.Cloned) {
        return hashEqual(cellInfo.value.cell_id[0], dnaHash);
      }
    });

    return cellInfo;
  }

  private _makeCellInfoNormalized(provisionedCellInfo: ProvisionedCell, cell: CellInfo ) {
    const originalDnaHash = provisionedCellInfo.cell_id[0];

    if(cell.type === CellType.Provisioned) {
      return {
        originalDnaHash,
        cellId: cell.value.cell_id, 
        cellInfo: cell,
        roleName: ROLE_NAME,
        name: cell.value.name,
        networkSeed: cell.value.dna_modifiers.network_seed,
        displayName: cell.value.dna_modifiers.network_seed === "" ? "Public" : cell.value.name,
      };
    } else if(cell.type == CellType.Cloned) {
      return {
        originalDnaHash,
        cellId: cell.value.cell_id,
        cellInfo: cell,
        roleName: cell.value.clone_id,
        name: cell.value.name,
        networkSeed: cell.value.dna_modifiers.network_seed,
        displayName: cell.value.dna_modifiers.network_seed === "" ? "Public" : cell.value.name,
      };
    }
  }
}
