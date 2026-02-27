import { ProfilesClient } from '@holochain-open-dev/profiles';
import type { AgentPubKey } from '@holochain/client';

/**
 * Check if any profiles exist in the DNA profiles zome.
 * Since Moss users don't write to the DNA zome by default,
 * any profile found there indicates a Tauri (non-Moss) user.
 */
export async function detectExternalProfiles(
  dnaProfilesClient: ProfilesClient,
): Promise<boolean> {
  const agents = await dnaProfilesClient.getAgentsWithProfile();
  return agents.length > 0;
}

/**
 * Read the current user's profile from Moss and write/update it
 * in the DNA profiles zome so that Tauri users can see it.
 */
export async function syncProfileToDna(
  mossProfilesClient: ProfilesClient,
  dnaProfilesClient: ProfilesClient,
  myPubKey: AgentPubKey,
): Promise<void> {
  const mossProfile = await mossProfilesClient.getAgentProfile(myPubKey);
  if (!mossProfile) return;

  const dnaProfile = await dnaProfilesClient.getAgentProfile(myPubKey);

  if (!dnaProfile) {
    await dnaProfilesClient.createProfile(mossProfile.entry);
  } else {
    const mossEntry = mossProfile.entry;
    const dnaEntry = dnaProfile.entry;
    if (
      mossEntry.nickname !== dnaEntry.nickname ||
      mossEntry.fields?.avatar !== dnaEntry.fields?.avatar
    ) {
      await dnaProfilesClient.updateProfile(mossEntry);
    }
  }
}
