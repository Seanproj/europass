import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { CloudBackend, CloudUser } from './backend';
import { HandleTakenError, type PublicProfileData, type Remote, type RemoteVisit } from './types';

const PAGE = 500;
const BUCKET = 'photos';

/** 로그인 후 돌아올 주소: 앱의 첫 화면 (GitHub Pages 하위 경로 포함) */
const redirectTo = () => `${location.origin}${location.pathname}`;

type Row = {
  id: string;
  city_id: string | null;
  date: string | null;
  end_date: string | null;
  note: string;
  photos: string[];
  legacy: RemoteVisit['legacy'];
  created_at: number;
  updated_at: number;
  deleted: boolean;
  seq: number;
};

const toRemote = (r: Row): RemoteVisit => ({
  id: r.id,
  cityId: r.city_id,
  date: r.date,
  endDate: r.end_date,
  note: r.note,
  photos: r.photos ?? [],
  legacy: r.legacy,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  deleted: r.deleted,
});

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function download(client: SupabaseClient, path: string): Promise<Blob> {
  const blob = check(await client.storage.from(BUCKET).download(path));
  if (!blob) throw new Error(`사진을 받지 못했어요: ${path}`);
  return blob;
}

function supabaseRemote(client: SupabaseClient, userId: string): Remote {
  return {
    userId,
    async pullVisits(cursor) {
      const rows: RemoteVisit[] = [];
      let after = cursor ? Number(cursor) : 0;
      for (;;) {
        const page = check(
          await client.from('visits').select('*').gt('seq', after).order('seq').limit(PAGE),
        ) as Row[];
        rows.push(...page.map(toRemote));
        if (page.length) after = Number(page[page.length - 1]!.seq);
        if (page.length < PAGE) break;
      }
      return { rows, cursor: after ? String(after) : cursor };
    },
    async pushVisits(rows) {
      const body = rows.map((r) => ({
        id: r.id,
        city_id: r.cityId,
        date: r.date,
        end_date: r.endDate,
        note: r.note,
        photos: r.photos,
        legacy: r.legacy,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        deleted: r.deleted,
      }));
      check(await client.rpc('push_visits', { rows: body }));
    },
    async uploadPhoto(path, blob) {
      const { error } = await client.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type, upsert: false });
      // 같은 경로 = 같은 사진 (이미 있음)
      if (error && !/exists|duplicate/i.test(error.message)) throw new Error(error.message);
    },
    downloadPhoto: (path) => download(client, path),
    async getProfile() {
      const row = check(
        await client.from('profiles').select('name, home_city_id, updated_at').eq('id', userId).maybeSingle(),
      ) as { name: string; home_city_id: string; updated_at: number } | null;
      return row && { name: row.name, homeCityId: row.home_city_id, updatedAt: Number(row.updated_at) };
    },
    async putProfile(p) {
      check(
        await client
          .from('profiles')
          .upsert({ id: userId, name: p.name, home_city_id: p.homeCityId, updated_at: p.updatedAt }),
      );
    },
    async getPublicSettings() {
      const row = check(
        await client
          .from('profiles')
          .select('handle, is_public, share_notes, share_photos')
          .eq('id', userId)
          .maybeSingle(),
      ) as { handle: string | null; is_public: boolean; share_notes: boolean; share_photos: boolean } | null;
      return {
        handle: row?.handle ?? null,
        isPublic: !!row?.is_public,
        shareNotes: !!row?.share_notes,
        sharePhotos: !!row?.share_photos,
      };
    },
    async setPublicSettings(s) {
      const { error } = await client.from('profiles').upsert({
        id: userId,
        handle: s.handle,
        is_public: s.isPublic,
        share_notes: s.shareNotes,
        share_photos: s.sharePhotos,
      });
      if (error?.code === '23505') throw new HandleTakenError();
      if (error) throw new Error(error.message);
    },
  };
}

export function createSupabaseBackend(): CloudBackend {
  const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const toUser = (u: { id: string; email?: string | null } | null | undefined): CloudUser | null =>
    u ? { id: u.id, email: u.email ?? null } : null;

  return {
    async getUser() {
      // 로그인 후 돌아온 주소면 여기서 코드를 세션으로 바꾼다
      const { data } = await client.auth.getSession();
      return toUser(data.session?.user);
    },
    onAuthChange(cb) {
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    async signInWithGoogle() {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo() },
      });
      if (error) throw new Error(error.message);
    },
    async signInWithEmail(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await client.auth.signOut();
    },
    remote: (user) => supabaseRemote(client, user.id),
    async fetchPublicProfile(handle) {
      const data = check(
        await client.rpc('public_profile', { p_handle: handle }),
      ) as PublicProfileData | null;
      return data ?? null;
    },
    fetchPublicPhoto: (path) => download(client, path),
  };
}
