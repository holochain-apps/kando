import { assert, test } from 'vitest';
import { encode } from '@msgpack/msgpack';
import { AppBundleSource, Record } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { dhtSync, runScenario } from '@holochain-open-dev/tryorama';

const kandoHapp = process.cwd() + '/../workdir/kando.happ';

// Holochain runs every zome's init on the first zome call, and syn's init
// creates a cap grant. So this round trip also proves the zomes start on
// this conductor version.
test('a board document written by Alice is read back by Bob', async () => {
  await runScenario(async scenario => {
    const appSource = { appBundleSource: { type: 'path', value: kandoHapp } as AppBundleSource };
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);
    await scenario.shareAllAgents();

    const initialState = encode({ name: 'Board from Alice' });
    const created = new EntryRecord<any>(
      await alice.cells[0].callZome<Record>({
        zome_name: 'syn',
        fn_name: 'create_document',
        payload: { initial_state: initialState, meta: undefined },
      })
    );

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    const record = await bob.cells[0].callZome<Record | null>({
      zome_name: 'syn',
      fn_name: 'get_document',
      payload: created.entryHash,
    });
    assert.ok(record, 'Bob did not find the document');
    const read = new EntryRecord<any>(record);
    assert.deepEqual(read.entryHash, created.entryHash);
    assert.deepEqual(new Uint8Array(read.entry.initial_state), new Uint8Array(initialState));
  });
});
