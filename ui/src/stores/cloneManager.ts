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
  needsOnboarding: Writable<boolean>;

  constructor(
    public client: AppClient,
    public weaveClient?: WeaveClient,
  ) {
    this.needsOnboarding = writable(false);
    this.activeDnaHash = writable<DnaHash>();
    this.activeDnaHash.subscribe(this._saveActiveDnaHash);
    this.activeCellInfoNormalized = asyncDerived(this.activeDnaHash, async ($activeDnaHash) => {
      const appInfo = await this.client.appInfo();
      if(!$activeDnaHash) {
        await this._loadActiveDnaHash(appInfo);
        $activeDnaHash = get(this.activeDnaHash);
      }
      if (!$activeDnaHash) {
        return undefined;
      }
      const cellInfo = this._findCellInfoWithDnaHash(appInfo, $activeDnaHash);
      return this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell, cellInfo)
    });
    this.activeStore = asyncDerived([this.activeDnaHash, this.activeCellInfoNormalized], async ([$activeDnaHash, $activeCellInfoNormalized]) => {
      if (!$activeDnaHash || !$activeCellInfoNormalized) {
        return undefined;
      }
      await this.activeCellInfoNormalized.load();

      const profilesClient = this.weaveClient !== undefined ? this.weaveClient.renderInfo.profilesClient : new ProfilesClient(this.client, $activeCellInfoNormalized.roleName);
      return new KanDoStore(this, new ProfilesStore(profilesClient), $activeDnaHash, $activeCellInfoNormalized.roleName);
    });
  }

  async hasClones(): Promise<boolean> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];
    return cells.some((cell) => cell.type === CellType.Cloned);
  }

  async listEnabledClones(): Promise<CellInfoNormalized[]> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];
    const provisioned = appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell;

    return cells
      .filter((cell) => cell.type === CellType.Cloned && cell.value.enabled)
      .map((cell) => this._makeCellInfoNormalized(provisioned, cell))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async list(): Promise<CellInfoNormalized[]> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];

    let cellsNormalized = cells.map((cell) => this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell, cell));

    // In non-Weave mode, filter out the provisioned cell
    if (this.weaveClient === undefined) {
      cellsNormalized = cellsNormalized.filter((cell) => cell.cellInfo.type !== CellType.Provisioned);
    }

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
        // In non-Weave mode, reject if this points to the provisioned cell
        if (this.weaveClient === undefined && matchingCellInfo.type === CellType.Provisioned) {
          // Fall through to _setDefaultActiveDnaHash
        } else {
          this.activeDnaHash.set(activeDnaHash);
          return;
        }
      }
    }

    // Otherwise, set active dna hash to default
    this._setDefaultActiveDnaHash(appInfo);
  }

  private _setDefaultActiveDnaHash(appInfo: AppInfo) {
    console.log("_setDefaultActiveDnaHash", appInfo);

    // In Weave mode, always use the provisioned cell
    if (this.weaveClient !== undefined) {
      if (appInfo.cell_info[ROLE_NAME][0].type !== CellType.Provisioned) {
        throw("incorrect cell type, must be provisioned")
      }
      const defaultDnaHash = appInfo.cell_info[ROLE_NAME][0].value.cell_id[0];
      this.activeDnaHash.set(defaultDnaHash);
      return;
    }

    // In non-Weave mode, find first enabled clone
    const clones = appInfo.cell_info[ROLE_NAME].filter(
      (c: CellInfo) => c.type === CellType.Cloned && c.value.enabled
    );
    if (clones.length > 0) {
      this.activeDnaHash.set(clones[0].value.cell_id[0]);
    } else {
      // No clones available - signal onboarding needed
      this.needsOnboarding.set(true);
    }
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
        displayName: cell.value.dna_modifiers.network_seed === "" ? "(base)" : cell.value.name,
      };
    } else if(cell.type == CellType.Cloned) {
      return {
        originalDnaHash,
        cellId: cell.value.cell_id,
        cellInfo: cell,
        roleName: cell.value.clone_id,
        name: cell.value.name,
        networkSeed: cell.value.dna_modifiers.network_seed,
        displayName: cell.value.name,
      };
    }
  }
}
