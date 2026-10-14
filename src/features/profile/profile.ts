import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PassportDB } from '../../db/db';
import type { Profile } from '../../db/types';

/** 프로필을 아직 정하지 않았을 때 (v0 기본값과 같은 프랑크푸르트) */
export const DEFAULT_PROFILE: Profile = { name: '여행자', homeCityId: 'de-frankfurt' };

export function useProfile(): Profile {
  const row = useLiveQuery(() => db.settings.get('profile'), []);
  return { ...DEFAULT_PROFILE, ...(row?.value as Profile | undefined) };
}

export async function saveProfile(d: PassportDB, profile: Profile): Promise<void> {
  await d.settings.put({
    key: 'profile',
    value: { name: profile.name.trim() || DEFAULT_PROFILE.name, homeCityId: profile.homeCityId },
  });
}

export async function getProfile(d: PassportDB): Promise<Profile> {
  const row = await d.settings.get('profile');
  return { ...DEFAULT_PROFILE, ...(row?.value as Profile | undefined) };
}
