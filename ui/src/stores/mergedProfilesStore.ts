import { ProfilesClient, ProfilesStore, type Profile } from '@holochain-open-dev/profiles';
import type { EntryRecord } from '@holochain-open-dev/utils';
import { asyncDerived, joinAsync, type AsyncReadable, asyncReadable } from '@holochain-open-dev/stores';
import { type AgentPubKey, LazyHoloHashMap, encodeHashToBase64 } from '@holochain/client';
import type { AppClient } from '@holochain/client';
import { detectExternalProfiles, syncProfileToDna } from '../utils/profileSync';

/**
 * Creates a ProfilesStore that wraps both a Moss profiles store and a DNA profiles store.
 *
 * On startup, checks if external (non-Moss) profiles exist in the DNA.
 * If so, immediately syncs the Moss user's profile into the DNA.
 *
 * For profile lookups: tries Moss first, falls back to DNA.
 * When a DNA fallback succeeds, activates mixed mode and syncs own profile.
 */
export async function createMergedProfilesStore(
  mossProfilesClient: ProfilesClient,
  dnaProfilesClient: ProfilesClient,
  appClient: AppClient,
): Promise<ProfilesStore> {
  const mossStore = new ProfilesStore(mossProfilesClient);
  const dnaStore = new ProfilesStore(dnaProfilesClient);

  // Check for external profiles at startup
  let mixedModeActive = await detectExternalProfiles(dnaProfilesClient);
  let syncPromise: Promise<void> | null = null;

  // One-shot: sync our Moss profile into the DNA when mixed mode activates
  function ensureSynced(): void {
    if (syncPromise) return;
    syncPromise = syncProfileToDna(
      mossProfilesClient, dnaProfilesClient, appClient.myPubKey
    ).catch(e => console.warn('Failed to sync profile to DNA:', e));
  }

  // If mixed mode detected at startup, sync immediately
  if (mixedModeActive) {
    ensureSynced();
  }

  // Create a new ProfilesStore from the Moss client (so web components write to Moss)
  // then override its reactive properties with merged versions
  const mergedStore = new ProfilesStore(mossProfilesClient);

  // Override profiles: try Moss first, fall back to DNA
  mergedStore.profiles = new LazyHoloHashMap((agent: AgentPubKey) => {
    const mossProfile = mossStore.profiles.get(agent);
    const dnaProfile = dnaStore.profiles.get(agent);

    return asyncDerived(
      joinAsync([mossProfile, dnaProfile], { errors: 'filter_out' }) as AsyncReadable<[EntryRecord<Profile> | undefined, EntryRecord<Profile> | undefined]>,
      ([mossResult, dnaResult]) => {
        if (mossResult) return mossResult;
        if (dnaResult) {
          // Found a profile in DNA but not in Moss - activate mixed mode
          if (!mixedModeActive) {
            mixedModeActive = true;
            ensureSynced();
          }
          return dnaResult;
        }
        return undefined;
      }
    );
  });

  // Override myProfile to always use Moss (authoritative for own profile)
  mergedStore.myProfile = mossStore.myProfile;

  // Override agentsWithProfile: merge both sources
  mergedStore.agentsWithProfile = asyncDerived(
    joinAsync([mossStore.agentsWithProfile, dnaStore.agentsWithProfile], { errors: 'filter_out' }) as AsyncReadable<[AgentPubKey[], AgentPubKey[]]>,
    ([mossAgents, dnaAgents]) => {
      if (!mixedModeActive && dnaAgents.length === 0) {
        return mossAgents;
      }
      // Merge and deduplicate
      const seen = new Set<string>();
      const merged: AgentPubKey[] = [];
      for (const agent of [...mossAgents, ...dnaAgents]) {
        const b64 = encodeHashToBase64(agent);
        if (!seen.has(b64)) {
          seen.add(b64);
          merged.push(agent);
        }
      }
      return merged;
    }
  );

  // Override allProfiles to use the merged agentsWithProfile + merged profiles
  mergedStore.allProfiles = asyncDerived(
    mergedStore.agentsWithProfile,
    async (agents) => {
      const profileMap = new Map<Uint8Array, EntryRecord<Profile>>();
      const promises = agents.map(async (agent) => {
        try {
          // Try Moss first
          let profile = await mossProfilesClient.getAgentProfile(agent);
          if (!profile) {
            profile = await dnaProfilesClient.getAgentProfile(agent);
          }
          if (profile) {
            profileMap.set(agent, profile);
          }
        } catch {
          // Skip agents whose profiles can't be fetched
        }
      });
      await Promise.all(promises);
      return profileMap as ReadonlyMap<Uint8Array, EntryRecord<Profile>>;
    }
  );

  return mergedStore;
}
