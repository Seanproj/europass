-- Euro Passport 클라우드 동기화 (Phase 9)
-- 로그인하지 않아도 앱은 기기 안에서 완전히 동작한다. 이 스키마는 로그인한 사용자의 선택적 백업·동기화용.
-- 원칙: 모든 표는 RLS로 본인만 읽고 쓴다. 공개 프로필은 public_profile() 함수로만, 공개를 켠 사람의 공개한 항목만 나간다.

-- ── 프로필 ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  home_city_id text not null default 'de-frankfurt',
  -- 기기에서 마지막으로 고친 시각(ms). 이름·홈 도시는 더 최근 쪽이 이긴다
  updated_at bigint not null default 0,
  -- 공개 링크 ?u=handle
  handle text unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  is_public boolean not null default false,
  share_notes boolean not null default false,
  share_photos boolean not null default false
);

alter table public.profiles enable row level security;

create policy "본인 프로필만" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 방문 기록 ──────────────────────────────────────────
-- 받기 커서: 바뀔 때마다 새 번호를 받는다 (기기는 "마지막으로 본 번호 이후"만 받는다)
create sequence public.visit_sync_seq;

create table public.visits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  city_id text,
  date text,
  end_date text,
  note text not null default '',
  -- Storage 경로 `${user_id}/${sha256}.jpg`
  photos text[] not null default '{}',
  legacy jsonb,
  created_at bigint not null default 0,
  updated_at bigint not null,
  -- 삭제 표시 (다른 기기에도 지워지게. 지워진 기록은 공개되지 않는다)
  deleted boolean not null default false,
  seq bigint not null default nextval('public.visit_sync_seq'),
  primary key (user_id, id)
);

create index visits_user_seq on public.visits (user_id, seq);

alter table public.visits enable row level security;

create policy "본인 기록만" on public.visits
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 올리기: updated_at이 더 큰 쪽만 반영 (last-write-wins). 호출한 사람의 기록으로만 들어간다
create function public.push_visits(rows jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.visits as v
    (user_id, id, city_id, date, end_date, note, photos, legacy, created_at, updated_at, deleted, seq)
  select
    auth.uid(), r.id, r.city_id, r.date, r.end_date, coalesce(r.note, ''), coalesce(r.photos, '{}'),
    r.legacy, coalesce(r.created_at, 0), r.updated_at, coalesce(r.deleted, false), nextval('public.visit_sync_seq')
  from jsonb_to_recordset(rows) as r (
    id text, city_id text, date text, end_date text, note text, photos text[], legacy jsonb,
    created_at bigint, updated_at bigint, deleted boolean
  )
  on conflict (user_id, id) do update set
    city_id = excluded.city_id,
    date = excluded.date,
    end_date = excluded.end_date,
    note = excluded.note,
    photos = excluded.photos,
    legacy = excluded.legacy,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    deleted = excluded.deleted,
    seq = nextval('public.visit_sync_seq')
  where v.updated_at < excluded.updated_at;
$$;

grant execute on function public.push_visits(jsonb) to authenticated;

-- ── 공개 프로필 ─────────────────────────────────────────
-- 공개를 켠 사람만. 메모·사진은 각각 공개한 경우에만 담는다 (로그인하지 않은 사람도 읽을 수 있음)
create function public.public_profile(p_handle text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'handle', p.handle,
    'name', p.name,
    'homeCityId', p.home_city_id,
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'cityId', v.city_id,
        'date', v.date,
        'endDate', v.end_date,
        'note', case when p.share_notes then v.note else null end,
        'photos', case when p.share_photos then to_jsonb(v.photos) else '[]'::jsonb end
      ) order by v.date)
      from public.visits v
      where v.user_id = p.id and not v.deleted and v.city_id is not null and v.date is not null
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.handle = p_handle and p.is_public;
$$;

grant execute on function public.public_profile(text) to anon, authenticated;

-- ── 사진 (Storage) ─────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- 본인 폴더(${user_id}/...)만 올리고 읽는다
create policy "본인 사진 올리기" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "본인 사진 읽기" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 사진 공개를 켠 사람의 사진은 누구나 읽을 수 있다
create policy "공개한 사진 읽기" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1] and p.is_public and p.share_photos
    )
  );
